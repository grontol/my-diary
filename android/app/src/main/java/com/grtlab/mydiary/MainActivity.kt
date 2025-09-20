package com.grtlab.mydiary

import android.annotation.SuppressLint
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.toColorInt
import androidx.core.net.toUri
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private val FILE_CHOOSER_REQUEST_CODE = 1001
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private lateinit var webView: WebView

    @RequiresApi(Build.VERSION_CODES.O)
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        window.statusBarColor = "#701a75".toColorInt()

        webView = findViewById<WebView>(R.id.webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.javaScriptEnabled = true
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                return request?.url?.let { assetLoader.shouldInterceptRequest(it) }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                startActivityForResult(intent!!, FILE_CHOOSER_REQUEST_CODE)
                return true
            }
        }

        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun isAndroid() = true

            @RequiresApi(Build.VERSION_CODES.Q)
            @JavascriptInterface
            fun export(data: String) {
                val fileName = "data.txt"

                val resolver = contentResolver
                val existingUri = findExistingDownload(this@MainActivity, fileName)

                val uri = if (existingUri != null) {
                    existingUri
                } else {
                    val contentValues = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, "data.txt")
                        put(MediaStore.Downloads.MIME_TYPE, "text/plain")
                        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }

                    resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                }

                uri?.let {
                    resolver.openOutputStream(it, "wt")?.use { output ->
                        output.write(data.toByteArray())
                    }
                }

                Toast.makeText(this@MainActivity, "File saved: $uri", Toast.LENGTH_LONG).show()
            }

            @JavascriptInterface
            fun setData(storeName: String, data: String): String? {
                return WebRepo.setData(storeName, data)
            }

            @JavascriptInterface
            fun pushData(kind: String, storeName: String, data: String) {
                WebRepo.pushEvent(WebEvent(kind, storeName, data), true)
            }

            @JavascriptInterface
            fun startServer() {
                val intent = Intent(this@MainActivity, WebServerService::class.java)
                startForegroundService(intent)
            }

            @JavascriptInterface
            fun stopServer() {
                val intent = Intent(this@MainActivity, WebServerService::class.java)
                stopService(intent)
            }

            @JavascriptInterface
            fun isServerRunning(): Boolean {
                return WebServerService.isRunning
            }
        }, "AndroidEnv")

//        webView.loadUrl("https://grontol.github.io/my-diary/")
        webView.loadUrl("http://192.168.100.21:5173")
//        webView.loadUrl("file:///android_asset/index.html")
//        webView.loadUrl("https://appassets.androidplatform.net/index.html")

        WebRepo.event.observe(this) {
            val escaped = JSONObject.quote(it.data)
            webView.evaluateJavascript("webEvent('${it.kind}', '${it.storeName}', ${escaped})", null)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                val result = arrayOf(data.dataString!!.toUri())
                filePathCallback?.onReceiveValue(result)
            } else {
                filePathCallback?.onReceiveValue(null)
            }
            filePathCallback = null
        }
    }

    @SuppressLint("GestureBackNavigation")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        }
        else {
            super.onBackPressed()
        }
    }
}

@RequiresApi(Build.VERSION_CODES.Q)
fun findExistingDownload(context: Context, fileName: String): Uri? {
    val projection = arrayOf(MediaStore.Downloads._ID, MediaStore.Downloads.DISPLAY_NAME)
    val selection = "${MediaStore.Downloads.DISPLAY_NAME}=?"
    val selectionArgs = arrayOf(fileName)

    context.contentResolver.query(
        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        projection,
        selection,
        selectionArgs,
        null
    )?.use { cursor ->
        if (cursor.moveToFirst()) {
            val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Downloads._ID))
            return ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id)
        }
    }
    return null
}