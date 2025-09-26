package com.grtlab.mydiary

import android.content.Context
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.toColorInt
import androidx.media3.common.MediaItem
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.ui.PlayerView
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow


class VideoActivity : AppCompatActivity() {
    private lateinit var playerView: PlayerView
    private var player: ExoPlayer? = null

    @OptIn(UnstableApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_video)

        window.statusBarColor = "#000000".toColorInt()

        playerView = findViewById(R.id.player_view)

        val videoUri = intent.data

        if (videoUri == null) {
            finish()
            return
        }

        val audioProcessor = LimiterAudioProcessor(intent.getFloatExtra("gain", 0f))
        val renderersFactory = CustomRenderersFactory(this, arrayOf(audioProcessor))

        player = ExoPlayer.Builder(this)
            .setRenderersFactory(renderersFactory)
            .setSeekBackIncrementMs(10000)
            .setSeekForwardIncrementMs(10000)
            .build().apply {
                val mediaItem = MediaItem.fromUri(videoUri)
                setMediaItem(mediaItem)
                prepare()
                playWhenReady = true
            }

        playerView.player = player
    }

    override fun onStop() {
        super.onStop()
        player?.release()
        player = null
    }
}

@UnstableApi
class LimiterAudioProcessor(
    private val gain: Float = 2.0f,
    private val limit: Float = 0.9f
) : BaseAudioProcessor() {
    private val linearGain = dbToLinear(gain)

    override fun onConfigure(inputAudioFormat: AudioProcessor.AudioFormat): AudioProcessor.AudioFormat {
        return inputAudioFormat
    }

    override fun isActive(): Boolean {
        super.isActive()
        return gain != 0f
    }

    override fun queueInput(inputBuffer: ByteBuffer) {
        val out = replaceOutputBuffer(inputBuffer.remaining())

        while (inputBuffer.hasRemaining()) {
            val sample = inputBuffer.short
            var processed = (sample * linearGain).toInt()
            processed = min((Short.MAX_VALUE * limit).toInt(), max(Short.MIN_VALUE.toInt(), processed))
            out.putShort(processed.toShort())
        }

        out.flip()
        inputBuffer.position(inputBuffer.limit())
    }

    private fun dbToLinear(db: Float): Float {
        return 10f.pow(db / 20f)
    }
}

@UnstableApi
class CustomRenderersFactory(
    context: Context,
    private val audioProcessors: Array<AudioProcessor>
) : DefaultRenderersFactory(context) {
    override fun buildAudioSink(
        context: Context,
        enableFloatOutput: Boolean,
        enableAudioTrackPlaybackParams: Boolean
    ): AudioSink {
        return DefaultAudioSink.Builder(context)
            .setEnableFloatOutput(enableFloatOutput)
            .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
            .setAudioProcessors(audioProcessors) // <-- inject processors di sini
            .build()
    }
}