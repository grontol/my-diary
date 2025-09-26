package com.grtlab.mydiary

import android.annotation.SuppressLint
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatActivity.RESULT_OK
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import androidx.webkit.WebViewAssetLoader
import com.google.gson.Gson
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream

private val gson = Gson()

@SuppressLint("SetJavaScriptEnabled")
class WebViewHelper(
    private val context: AppCompatActivity,
    private val webView: WebView,
) {
    private val FILE_CHOOSER_REQUEST_CODE = 1001
    private val RECORD_VIDEO_REQUEST_CODE = 1234

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var videoUri: Uri? = null
    private var recordVideoCbId: String? = null
    private var compressVideoCbId: String? = null

    init {
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/files/", ExternalFilePathHandler(context.getExternalFilesDir(Environment.DIRECTORY_MOVIES)!!))
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(context))
            .build()

        webView.settings.javaScriptEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowFileAccessFromFileURLs = true
        webView.settings.allowUniversalAccessFromFileURLs = true

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
                this@WebViewHelper.filePathCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                context.startActivityForResult(intent!!, FILE_CHOOSER_REQUEST_CODE)
                return true
            }
        }

        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun isAndroid() = true

            @JavascriptInterface
            fun export(data: String, fileName: String) {
                val resolver = context.contentResolver
                val existingUri = findExistingDownload(context, fileName)

                val uri = if (existingUri != null) {
                    existingUri
                } else {
                    val contentValues = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, fileName)
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

                Toast.makeText(context, "File saved: ~/Downloads/${fileName}", Toast.LENGTH_LONG).show()
            }

            @JavascriptInterface
            fun repoGetAll(storeName: String): String {
                return DbRepo.getAll(storeName)
            }

            @JavascriptInterface
            fun repoGet(storeName: String, id: String): String {
                return DbRepo.get(storeName, id)
            }

            @JavascriptInterface
            fun repoInsert(storeName: String, data: String) {
                DbRepo.insert(storeName, data, DataChangedFrom.Android, null)
            }

            @JavascriptInterface
            fun repoUpdate(storeName: String, id: String, data: String) {
                DbRepo.update(storeName, id, data, DataChangedFrom.Android, null)
            }

            @JavascriptInterface
            fun repoDelete(storeName: String, id: String) {
                DbRepo.delete(storeName, id, DataChangedFrom.Android, null)
            }

            @JavascriptInterface
            fun repoImport(storeName: String, data: String) {
                DbRepo.import(storeName, data, DataChangedFrom.Android, null)
            }

            @JavascriptInterface
            fun startServer() {
                val intent = Intent(context, WebServerService::class.java)
                context.startForegroundService(intent)
            }

            @JavascriptInterface
            fun stopServer() {
                val intent = Intent(context, WebServerService::class.java)
                context.stopService(intent)
            }

            @JavascriptInterface
            fun isServerRunning(): Boolean {
                return WebServerService.isRunning
            }

            @JavascriptInterface
            fun recordVideo(cbId: String) {
                recordVideoCbId = cbId
                val intent = Intent(MediaStore.ACTION_VIDEO_CAPTURE)

                val videoFile = getMovieDirFile("diary_${System.currentTimeMillis()}.mp4")
                videoUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    videoFile
                )

                intent.putExtra(MediaStore.EXTRA_OUTPUT, videoUri)

                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)

                context.startActivityForResult(intent, RECORD_VIDEO_REQUEST_CODE)
            }

            @JavascriptInterface
            fun compressVideo(name: String, cbId: String) {
                compressVideoCbId = cbId

                val videoFile = getMovieDirFile(name)
                val compressedFile = getMovieDirFile(videoFile.name.replace(".mp4", "_compressed.mp4"))

                VideoUtils.compress(videoFile, compressedFile) { success, completed, progress ->
                    var newSize = 0L

                    if (completed) {
                        videoFile.delete()
                        compressedFile.renameTo(videoFile)
                        newSize = videoFile.length()
                    }

                    videoCompressProgress(success, completed, progress, newSize)
                }
            }

            @JavascriptInterface
            fun playVideo(name: String, gain: Float) {
                val videoFile = getMovieDirFile(name)
                val videoUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    videoFile
                )

                val intent = Intent(context, VideoActivity::class.java)
                intent.data = videoUri
                intent.putExtra("gain", gain)
                context.startActivity(intent)
            }
        }, "AndroidEnv")

        webView.loadUrl("http://192.168.100.21:5173")
//        webView.loadUrl("https://appassets.androidplatform.net/index.html")

        DbRepo.changedEvent.observe(context) {
            dataChanged(it)
        }
    }

    private fun dataChanged(e: DataChangedEvent) {
        val from = when (e.from) {
            DataChangedFrom.Android -> "android"
            DataChangedFrom.Client -> "client"
        }

        webView.evaluateJavascript("dataChangedEvent('$from', '${e.storeName}')", null)
    }

    private fun videoRecordingDone(resultOk: Boolean) {
        recordVideoCbId?.let { cbId ->
            if (resultOk && videoUri != null) {
                val file = File(videoUri!!.path!!)

                val originalFile = getMovieDirFile(file.name)
                val thumbnailFile = getMovieDirFile(file.name.replace(".mp4", "_thumb.png"))

                val videoData = JSONObject.quote(gson.toJson(mapOf(
                    "name" to originalFile.name,
                    "length" to VideoUtils.getDuration(originalFile),
                    "size" to originalFile.length(),
                    "thumbnail" to if (VideoUtils.createThumbnail(originalFile, thumbnailFile)) thumbnailFile.name else null
                )))

                webView.evaluateJavascript("callFn('${cbId}', true, $videoData)", null)
            }
            else {
                webView.evaluateJavascript("callFn('${cbId}', false)", null)
            }
        }
    }

    private fun videoCompressProgress(success: Boolean, completed: Boolean, progress: Double, newSize: Long) {
        compressVideoCbId?.let { cbId ->
            webView.post {
                webView.evaluateJavascript("callFn('${cbId}', ${success}, ${completed}, ${progress}, ${newSize})", null)
            }
        }
    }

    fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                val result = arrayOf(data.dataString!!.toUri())
                filePathCallback?.onReceiveValue(result)
            } else {
                filePathCallback?.onReceiveValue(null)
            }
            filePathCallback = null
        }
        else if (requestCode == RECORD_VIDEO_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                videoRecordingDone(true)
//                videoUri?.let { uri ->
//                    val file = File(uri.path!!)
//                    val originalFile = File(
//                        context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
//                        file.name,
//                    )

//                    Toast.makeText(this, file.absolutePath, Toast.LENGTH_LONG).show()
//
//                    val compressedFile = File(
//                        getExternalFilesDir(Environment.DIRECTORY_MOVIES),
//                        file.name.replace(".mp4", "_compressed.mp4"),
//                    )
//
//                    val commands = arrayOf(
//                        "-i", originalFile.absolutePath,
//                        "-vf", "scale='min(720,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
//                        "-r", "15",
//                        "-c:v", "libx264",
//                        "-crf", "30",
//                        "-preset", "veryfast",
//                        "-c:a", "aac", "-b:a", "64k",
//                        "-movflags", "+faststart",
//                        compressedFile.absolutePath
//                    )
//
//                    val retriever = MediaMetadataRetriever()
//                    retriever.setDataSource(originalFile.absolutePath)
//                    val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
//                    val durationMs = durationStr?.toLongOrNull() ?: 0L
//                    retriever.release()
//
//                    FFmpegKit.executeWithArgumentsAsync(commands, { session ->
//                        val returnCode = session.returnCode
//                        if (ReturnCode.isSuccess(returnCode)) {
//                            if (originalFile.exists()) {
//                                val deleted = originalFile.delete()
//
//                                runOnUiThread {
//                                    Toast.makeText(
//                                        this@MainActivity,
//                                        "Original deleted: $deleted",
//                                        Toast.LENGTH_SHORT
//                                    ).show()
//                                }
//                            }
//                        } else {
//                            runOnUiThread {
//                                Toast.makeText(
//                                    this@MainActivity,
//                                    session.logsAsString,
//                                    Toast.LENGTH_LONG
//                                ).show()
//                            }
//                        }
//                    }, {
//
//                    }, { stat ->
//                        val progress = if (durationMs > 0) {
//                            stat.time / durationMs
//                        } else 0.0
//
//                        Log.d("XXXXXX", progress.toString())
//                    })
//                }
            } else {
                videoRecordingDone(false)
            }
        }
    }

    private fun getMovieDirFile(name: String): File {
        return File(
            context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
            name,
        )
    }
}

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

class ExternalFilePathHandler(
    private val baseDir: File,
) : WebViewAssetLoader.PathHandler {

    override fun handle(path: String): WebResourceResponse? {
        val file = File(baseDir, path)
        if (!file.exists()) return null

        val mimeType = when {
            file.name.endsWith(".mp4") -> "video/mp4"
            file.name.endsWith(".jpg") -> "image/jpeg"
            file.name.endsWith(".png") -> "image/png"
            else -> "application/octet-stream"
        }

        return WebResourceResponse(
            mimeType,
            "UTF-8",
            FileInputStream(file)
        )
    }
}