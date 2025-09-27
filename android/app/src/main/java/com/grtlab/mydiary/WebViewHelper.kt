package com.grtlab.mydiary

import android.annotation.SuppressLint
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
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
import java.io.FileOutputStream
import androidx.core.graphics.scale
import kotlin.concurrent.thread

private val gson = Gson()

@SuppressLint("SetJavaScriptEnabled")
class WebViewHelper(
    private val context: AppCompatActivity,
    private val webView: WebView,
) {
    private val FILE_CHOOSER_REQUEST_CODE = 1001
    private val RECORD_VIDEO_REQUEST_CODE = 1234
    private val UPLOAD_VIDEO_REQUEST_CODE = 1666
    private val TAKE_PHOTO_REQUEST_CODE = 1235
    private val UPLOAD_PHOTO_REQUEST_CODE = 1667

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private var videoUri: Uri? = null
    private var recordVideoCbId: String? = null
    private var uploadVideoCbId: String? = null
    private var compressVideoCbId: String? = null

    private var photoUri: Uri? = null
    private var takePhotoCbId: String? = null
    private var uploadPhotoCbId: String? = null

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
            fun uploadVideo(cbId: String) {
                uploadVideoCbId = cbId
                val intent = Intent(Intent.ACTION_GET_CONTENT)
                intent.setType("video/*")
                context.startActivityForResult(intent, UPLOAD_VIDEO_REQUEST_CODE)
            }

            @JavascriptInterface
            fun compressVideo(name: String, cbId: String) {
                compressVideoCbId = cbId

                val videoFile = getMovieDirFile(name)
                val compressedFile = getMovieDirFile(videoFile.name.replace(".mp4", "_compressed.mp4"))

                MediaUtils.compress(videoFile, compressedFile) { success, completed, progress ->
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

            @JavascriptInterface
            fun takePhoto(cbId: String) {
                takePhotoCbId = cbId
                val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)

                val photoFile = getMovieDirFile("diary_${System.currentTimeMillis()}_img.jpg")
                photoUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    photoFile
                )

                intent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri)

                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)

                context.startActivityForResult(intent, TAKE_PHOTO_REQUEST_CODE)
            }

            @JavascriptInterface
            fun uploadPhoto(cbId: String) {
                uploadPhotoCbId = cbId
                val intent = Intent(Intent.ACTION_GET_CONTENT)
                intent.setType("image/*")
                context.startActivityForResult(intent, UPLOAD_PHOTO_REQUEST_CODE)
            }

            @JavascriptInterface
            fun viewPhoto(name: String) {
                val photoFile = getMovieDirFile(name)
                val photoUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    photoFile
                )

                val intent = Intent(context, PhotoActivity::class.java)
                intent.data = photoUri
                context.startActivity(intent)
            }

            @JavascriptInterface
            fun deleteUnusedMedia() {
                val dir = context.getExternalFilesDir(Environment.DIRECTORY_MOVIES)

                dir?.list()?.let { files ->
                    val diaries = DbRepo.getAllDiaries()
                    val toRemove = mutableListOf<String>(*files)

                    for (diary in diaries) {
                        if (diary.type == DiaryType.Video) {
                            val content = diary.content.asJsonObject

                            val video = content.get("video").asString
                            val thumbnail = content.get("thumbnail").asString

                            toRemove.remove(video)
                            toRemove.remove(thumbnail)
                        }
                        else if (diary.type == DiaryType.Photo) {
                            val content = diary.content.asJsonObject
                            val image = content.get("image").asString
                            toRemove.remove(image)
                        }
                    }

                    for (f in toRemove) {
                        val file = getMovieDirFile(f)
                        if (file.exists()) {
                            file.delete()
                        }
                    }
                }
            }

            @JavascriptInterface
            fun deleteMedia(medias: Array<String>) {
                for (media in medias) {
                    val file = getMovieDirFile(media)
                    if (file.exists()) {
                        file.delete()
                    }
                }
            }
        }, "AndroidEnv")

//        webView.loadUrl("http://192.168.100.21:5173")
        webView.loadUrl("https://appassets.androidplatform.net/index.html")

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
                    "length" to MediaUtils.getDuration(originalFile),
                    "size" to originalFile.length(),
                    "thumbnail" to if (MediaUtils.createThumbnail(originalFile, thumbnailFile)) thumbnailFile.name else null
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

    private fun videoUploadProgress(success: Boolean, progress: Double, outputFile: File?) {
        uploadVideoCbId?.let { cbId ->
            val videoData = if (progress >= 1 && outputFile != null) {
                val thumbnailFile = getMovieDirFile(outputFile.name.replace(".mp4", "_thumb.png"))

                JSONObject.quote(
                    gson.toJson(
                        mapOf(
                            "name" to outputFile.name,
                            "length" to MediaUtils.getDuration(outputFile),
                            "size" to outputFile.length(),
                            "thumbnail" to if (MediaUtils.createThumbnail(
                                    outputFile,
                                    thumbnailFile
                                )
                            ) thumbnailFile.name else null
                        )
                    )
                )
            } else "null"

            webView.post {
                webView.evaluateJavascript("callFn('${cbId}', $success, $progress, $videoData)",null)
            }
        }
    }

    private fun takePhotoDone(resultOk: Boolean) {
        takePhotoCbId?.let { cbId ->
            if (resultOk && photoUri != null) {
                thread {
                    val file = getMovieDirFile(File(photoUri!!.path!!).name)
                    MediaUtils.compressPhoto(context, file)

                    val photoData = JSONObject.quote(
                        gson.toJson(
                            mapOf(
                                "name" to file.name,
                                "size" to file.length(),
                            )
                        )
                    )

                    webView.post {
                        webView.evaluateJavascript("callFn('${cbId}', true, $photoData)", null)
                    }
                }
            }
            else {
                webView.evaluateJavascript("callFn('${cbId}', false)", null)
            }
        }
    }

    private fun photoUploadProgress(success: Boolean, progress: Double, outputFile: File?) {
        uploadPhotoCbId?.let { cbId ->
            val photoData = if (progress >= 1 && outputFile != null) {
                MediaUtils.compressPhoto(context, outputFile)

                JSONObject.quote(
                    gson.toJson(
                        mapOf(
                            "name" to outputFile.name,
                            "size" to outputFile.length(),
                        )
                    )
                )
            } else "null"

            webView.post {
                webView.evaluateJavascript("callFn('${cbId}', $success, $progress, $photoData)",null)
            }
        }
    }

    fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                val result = arrayOf(data.dataString!!.toUri())
                filePathCallback?.onReceiveValue(result)
            }
            else {
                filePathCallback?.onReceiveValue(null)
            }

            filePathCallback = null
        }
        else if (requestCode == RECORD_VIDEO_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                videoRecordingDone(true)
            }
            else {
                videoRecordingDone(false)
            }
        }
        else if (requestCode == UPLOAD_VIDEO_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data?.data != null) {
                val outputFile = getMovieDirFile("diary_${System.currentTimeMillis()}.mp4")

                MediaUtils.copy(context, data.data!!, outputFile) { progress ->
                    videoUploadProgress(true, progress, outputFile)
                }
            }
            else {
                videoUploadProgress(false, 0.0, null)
            }
        }
        else if (requestCode == TAKE_PHOTO_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                takePhotoDone(true)
            }
            else {
                takePhotoDone(false)
            }
        }
        else if (requestCode == UPLOAD_PHOTO_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data?.data != null) {
                val outputFile = getMovieDirFile("diary_${System.currentTimeMillis()}_img.jpg")

                MediaUtils.copy(context, data.data!!, outputFile) { progress ->
                    photoUploadProgress(true, progress, outputFile)
                }
            }
            else {
                photoUploadProgress(false, 0.0, null)
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