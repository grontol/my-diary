package com.grtlab.mydiary

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode
import java.io.File
import java.io.FileOutputStream
import kotlin.concurrent.thread

object VideoUtils {
    fun compress(originalFile: File, compressedFile: File, cb: (success: Boolean, completed: Boolean, progress: Double) -> Unit) {
        val commands = arrayOf(
            "-i", originalFile.absolutePath,
            "-vf", "scale='min(720,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
            "-r", "15",
            "-c:v", "libx264",
            "-crf", "30",
            "-preset", "veryfast",
            "-c:a", "aac", "-b:a", "64k",
            "-movflags", "+faststart",
            compressedFile.absolutePath
        )

        val durationMs = getDuration(originalFile)

        FFmpegKit.executeWithArgumentsAsync(commands, { session ->
            val returnCode = session.returnCode
            if (ReturnCode.isSuccess(returnCode)) {
                cb(true, true, 1.0)
            } else {
                cb(false, false, 0.0)
            }
        }, {

        }, { stat ->
            val progress = if (durationMs > 0) {
                stat.time / durationMs
            } else 0.0

            cb(true, false, progress)
        })
    }

    fun copy(context: Context, input: Uri, output: File, onProgress: (progress: Double) -> Unit) {
        thread {
            val resolver = context.contentResolver
            val descriptor = resolver.openFileDescriptor(input, "r")
            val totalSize = descriptor?.statSize ?: -1L
            descriptor?.close()

            var lastTime = System.currentTimeMillis()

            resolver.openInputStream(input)?.use { ins ->
                FileOutputStream(output).use { outs ->
                    val buffer = ByteArray(8 * 1024)
                    var bytesCopied = 0L
                    var bytes = ins.read(buffer)

                    while (bytes >= 0) {
                        outs.write(buffer, 0, bytes)
                        bytesCopied += bytes

                        if (totalSize > 0) {
                            if (bytesCopied == totalSize) {
                                onProgress(1.0)
                            }
                            else {
                                val delta = System.currentTimeMillis() - lastTime

                                if (delta >= 500) {
                                    val progress = bytesCopied.toDouble() / totalSize
                                    onProgress(progress)
                                    lastTime = System.currentTimeMillis()
                                }
                            }
                        }

                        bytes = ins.read(buffer)
                    }
                }
            }
        }
    }

    fun createThumbnail(videoFile: File, thumbnailFile: File): Boolean {
        val command = arrayOf(
            "-i", videoFile.absolutePath,
            "-vf", "scale='min(720,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
            "-ss", "00:00:01",
            "-vframes", "1",
            thumbnailFile.absolutePath
        )

        val session = FFmpegKit.executeWithArguments(command)
        return ReturnCode.isSuccess(session.returnCode)
    }

    fun getDuration(file: File): Long {
        val retriever = MediaMetadataRetriever()
        retriever.setDataSource(file.absolutePath)
        val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
        val durationMs = durationStr?.toLongOrNull() ?: 0L
        retriever.release()

        return durationMs
    }
}