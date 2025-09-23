package com.grtlab.mydiary

import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonObject
import fi.iki.elonen.NanoHTTPD
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

private val gson = Gson()
private val port = 8888

class WebServer(
    private val context: Context
) : NanoHTTPD(port) {
    private val clients = ConcurrentHashMap<String, LinkedBlockingQueue<String>>()

    private val dataChangedObserver: (DataChangedEvent) -> Unit = { ev ->
        val deadClients = mutableListOf<String>()

        clients.forEach { (id, queue) ->
            if (ev.from == DataChangedFrom.Android || ev.clientId != id) {
                val offered = queue.offer(ev.storeName)
                if (!offered) {
                    deadClients.add(id)
                }
            }
        }

        deadClients.forEach { id ->
            clients.remove(id)
        }
    }

    override fun start() {
        super.start()
        DbRepo.changedEvent.observeForever(dataChangedObserver)
    }

    override fun stop() {
        DbRepo.changedEvent.removeObserver(dataChangedObserver)
        super.stop()
    }

    override fun serve(session: IHTTPSession): Response {
        val r = when (session.method) {
            Method.OPTIONS -> newFixedLengthResponse(Response.Status.OK, "text/plain", "")
            Method.GET -> {
                val uri = session.uri.trimStart('/')

                try {
                    if (uri == "events") {
                        val clientId = session.parms["id"] ?: UUID.randomUUID().toString()
                        val queue = clients.computeIfAbsent(clientId) { LinkedBlockingQueue() }

                        val first = queue.poll(30, TimeUnit.SECONDS)
                        val events = mutableListOf<String>()

                        if (first != null) {
                            events.add(first)
                            queue.drainTo(events)
                        }

                        val payload = gson.toJson(events)

                        newFixedLengthResponse(Response.Status.OK, "application/json", payload)
                    }
                    else if (uri.isEmpty()) {
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

                    val clientId = session.parms["id"] ?: UUID.randomUUID().toString()
                    val body = gson.fromJson(m["postData"]!!, JsonObject::class.java)

                    val kind = body.get("kind").asString
                    val storeName = body.get("storeName").asString

                    var res = "[]"

                    when (kind) {
                        "getAll" -> res = DbRepo.getAll(storeName)
                        "get" -> res = DbRepo.get(storeName, body.get("id").asString)
                        "insert" -> {
                            val data = body.get("data").asJsonObject.toString()
                            DbRepo.insert(storeName, data, DataChangedFrom.Client, clientId)
                        }
                        "update" -> {
                            val id = body.get("id").asString
                            val data = body.get("data").asJsonObject.toString()
                            DbRepo.update(storeName, id, data, DataChangedFrom.Client, clientId)
                        }
                        "delete" -> {
                            val id = body.get("id").asString
                            DbRepo.delete(storeName, id, DataChangedFrom.Client, clientId)
                        }
                        "import" -> {
                            val data = body.get("data").asJsonObject.toString()
                            DbRepo.import(storeName, data, DataChangedFrom.Client, clientId)
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