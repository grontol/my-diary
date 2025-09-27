package com.grtlab.mydiary

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.toColorInt
import com.bumptech.glide.Glide
import com.jsibbold.zoomage.ZoomageView

class PhotoActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_photo)

        window.statusBarColor = "#000000".toColorInt()

        val zoomageView: ZoomageView = findViewById(R.id.zoomageView)

        val photoUri = intent.data

        if (photoUri == null) {
            finish()
            return
        }

        Glide.with(this)
            .load(photoUri)
            .into(zoomageView)
    }
}