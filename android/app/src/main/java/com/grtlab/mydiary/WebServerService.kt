package com.grtlab.mydiary

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
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
        DbRepo.init(this)
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
        val stopIntent = Intent(this, StopServerReceiver::class.java).apply {
            action = "STOP_SERVER"
        }
        val stopPendingIntent = PendingIntent.getBroadcast(
            this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Diary Server")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .addAction(R.drawable.ic_stop, "Stop Server", stopPendingIntent)
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

class StopServerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "STOP_SERVER") {
            // Stop service
            val stopIntent = Intent(context, WebServerService::class.java)
            context.stopService(stopIntent)
        }
    }
}