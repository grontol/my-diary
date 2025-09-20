package com.grtlab.mydiary

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

class WebServerService : Service() {
    private var server: WebServer? = null

    override fun onBind(intent: Intent?) = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        isRunning = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Jalankan server kalau belum
        if (server == null) {
            server = WebServer(this)
            server?.start()

            val notification = buildNotification("Diary/Tracking server is running")
            startForeground(1, notification)
        }
        // Service tetap jalan meski dibunuh (restart)
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        server?.stop()
        server = null
        isRunning = false
    }

    private fun buildNotification(content: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Diary Server")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Diary Server Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "WebServerChannel"

        var isRunning = false
    }
}