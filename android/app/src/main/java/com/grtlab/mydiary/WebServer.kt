package com.grtlab.mydiary

import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonObject
import fi.iki.elonen.NanoHTTPD
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URL

private val gson = Gson()
private val port = 8888

class WebServer(
    private val context: Context
) : NanoHTTPD(port) {
    override fun serve(session: IHTTPSession): Response {
        val r = when (session.method) {
            Method.OPTIONS -> newFixedLengthResponse(Response.Status.OK, "text/plain", "")
            Method.GET -> {
                val uri = session.uri.trimStart('/')

                try {
                    if (uri.isEmpty()) {
                        val serverIpAddress = getLocalIp()

                        val content = context.assets.open("index.html")
                            .bufferedReader()
                            .use { it.readText() }
                            .replace(
                                "window.process =",
                                "window.clientMode = true; window.serverBaseUrl = 'http://${serverIpAddress}:${port}'; window.process ="
                            )

                        newFixedLengthResponse(
                            Response.Status.OK,
                            "text/html",
                            content
                        )
                    } else {
                        val mimeType = getMimeType(uri)
                        val inputStream = context.assets.open(uri)

                        newChunkedResponse(
                            Response.Status.OK,
                            mimeType,
                            inputStream
                        )
                    }
                } catch (e: Exception) {
                    newFixedLengthResponse(
                        Response.Status.NOT_FOUND,
                        "text/plain",
                        "404 Not Found"
                    )
                }
            }
            Method.POST -> {
                try {
                    val m = mutableMapOf<String, String>()
                    session.parseBody(m)

                    val body = gson.fromJson(m["postData"]!!, JsonObject::class.java)

                    val kind = body.get("kind").asString
                    val storeName = body.get("storeName").asString

                    var res = "[]"

                    when (kind) {
                        "getAll" -> res = WebRepo.getDataAll(storeName)
                        "get" -> res = WebRepo.getDataSingle(storeName, body.get("data").asString)

                        "put" -> {
                            val data = body.get("data").asJsonObject.toString()
                            WebRepo.pushEvent(WebEvent(kind, storeName, data))
                        }

                        "delete" -> {
                            val data = body.get("data").asString
                            WebRepo.pushEvent(WebEvent(kind, storeName, data))
                        }
                    }

                    newFixedLengthResponse(Response.Status.OK, "application/json", res)
                }
                catch (e: Exception) {
                    newFixedLengthResponse(
                        Response.Status.BAD_REQUEST,
                        "application/json",
                        "{ \"success\": false, message: \"message\": \"Error processing request\" }"
                    )
                }
            }
            else -> {
                newFixedLengthResponse(Response.Status.OK, "application/json", "{ \"success\": true }")
            }
        }

        addCors(r)
        return r
    }

    private fun getMimeType(fileName: String): String {
        return when {
            fileName.endsWith(".html") -> "text/html"
            fileName.endsWith(".js") -> "application/javascript"
            fileName.endsWith(".css") -> "text/css"
            fileName.endsWith(".png") -> "image/png"
            fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") -> "image/jpeg"
            else -> "application/octet-stream"
        }
    }

    private fun addCors(r: Response) {
        r.addHeader("Connection", "close")

        r.addHeader("Access-Control-Allow-Origin", "*")
        r.addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        r.addHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    }

    companion object {
        fun getLocalIp(): String? {
            try {
                val en = NetworkInterface.getNetworkInterfaces()
                while (en.hasMoreElements()) {
                    val intf = en.nextElement()
                    val addrs = intf.inetAddresses
                    while (addrs.hasMoreElements()) {
                        val addr = addrs.nextElement()
                        if (!addr.isLoopbackAddress && addr is Inet4Address) return addr.hostAddress
                    }
                }
            } catch (_: Exception) {}
            return null
        }
    }
}