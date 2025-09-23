package com.grtlab.mydiary

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import androidx.core.database.getStringOrNull
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.Observer
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.reflect.TypeToken
import java.util.concurrent.BlockingQueue
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.atomic.AtomicBoolean

private val gson = Gson()

enum class DataChangedFrom {
    Android,
    Client,
}

data class DataChangedEvent(
    val from: DataChangedFrom,
    val storeName: String,
    val clientId: String?,
)

data class ActorData(
    val id: String,
    val name: String,
    val emoji: String,
    val color: String,
)

data class TrackData(
    val id: String,
    val name: String,
    val color: String,
    val type: String,
    val shape: String,
    val createdAt: String,
    val editedAt: String,
)

data class DiaryData(
    val id: String,
    val actor: String,
    val date: String,
    val content: JsonElement,
)

data class TrackingData(
    val id: String,
    val dataId: String,
    val date: String,
    val value: String,
    val note: String?,
    val createdAt: String,
    val editedAt: String,
)

data class ResepData(
    val id: String,
    val name: String,
    val bahans: List<String>,
    val tags: List<String>,
    val content: JsonElement,
)

fun Cursor.string(column: String): String {
    return this.getString(this.getColumnIndexOrThrow(column))
}

fun Cursor.stringOrNull(column: String): String? {
    return this.getStringOrNull(this.getColumnIndexOrThrow(column))
}

class Model<T>(
    val table: String,
    val toModel: (cursor: Cursor) -> T,
    val toValues: ContentValues.(data: T) -> Unit
) {
    fun getAll(db: SQLiteDatabase): List<T> {
        return db.query(table, null, null, null, null, null, null).use {
            buildList {
                while (it.moveToNext()) {
                    add(toModel(it))
                }
            }
        }
    }

    fun get(db: SQLiteDatabase, id: String): T? {
        return db.query(table, null, "id = ?", arrayOf(id), null, null, null).use {
            if (it.moveToNext()) {
                toModel(it)
            }
            else {
                null
            }
        }
    }

    fun insert(db: SQLiteDatabase, data: T) {
        val values = ContentValues().apply { toValues(this, data) }
        db.insert(table, null, values)
    }

    fun update(db: SQLiteDatabase, id: String, data: T) {
        val values = ContentValues().apply { toValues(this, data) }
        db.update(table, values, "id = ?", arrayOf(id))
    }

    fun delete(db: SQLiteDatabase, id: String) {
        db.delete(table, "id = ?", arrayOf(id))
    }

    fun import(db: SQLiteDatabase, data: List<T>) {
        db.execSQL("DELETE FROM $table")

        for (r in data) {
            insert(db, r)
        }
    }
}

val actorModel = Model("actor", { c ->
    ActorData(
        id = c.string("id"),
        name = c.string("name"),
        emoji = c.string("emoji"),
        color = c.string("color"),
    )
}, {
    put("id", it.id)
    put("name", it.name)
    put("emoji", it.emoji)
    put("color", it.color)
})

val trackDataModel = Model("track_data", { c ->
    TrackData(
        id = c.string("id"),
        name = c.string("name"),
        color = c.string("color"),
        type = c.string("type"),
        shape = c.string("shape"),
        createdAt = c.string("createdAt"),
        editedAt = c.string("editedAt"),
    )
}, {
    put("id", it.id)
    put("name", it.name)
    put("color", it.color)
    put("type", it.type)
    put("shape", it.shape)
    put("createdAt", it.createdAt)
    put("editedAt", it.editedAt)
})

val diaryModel = Model("diary", { c ->
    DiaryData(
        id = c.string("id"),
        actor = c.string("actor"),
        date = c.string("date"),
        content = gson.fromJson(c.string("content"), JsonElement::class.java),
    )
}, {
    put("id", it.id)
    put("actor", it.actor)
    put("date", it.date)
    put("content", gson.toJson(it.content))
})

val trackingModel = Model("tracking", { c ->
    TrackingData(
        id = c.string("id"),
        dataId = c.string("dataId"),
        date = c.string("date"),
        value = c.string("value"),
        note = c.stringOrNull("note"),
        createdAt = c.string("createdAt"),
        editedAt = c.string("editedAt"),
    )
}, {
    put("id", it.id)
    put("dataId", it.dataId)
    put("date", it.date)
    put("value", it.value)
    put("note", it.note)
    put("createdAt", it.createdAt)
    put("editedAt", it.editedAt)
})

val resepModel = Model("resep", { c ->
    ResepData(
        id = c.string("id"),
        name = c.string("name"),
        bahans = c.string("bahans").split(",").map { it.trim() }.filter { it.isNotEmpty() },
        tags = c.string("tags").split(",").map { it.trim() }.filter { it.isNotEmpty() },
        content = gson.fromJson(c.string("content"), JsonElement::class.java),
    )
}, {
    put("id", it.id)
    put("name", it.name)
    put("bahans", it.bahans.joinToString(", "))
    put("tags", it.tags.joinToString(", "))
    put("content", gson.toJson(it.content))
})

object DbRepo {
    lateinit var db: SQLiteDatabase

    private val _changedEvent = MutableLiveData<DataChangedEvent>()
    val changedEvent: LiveData<DataChangedEvent> get() = _changedEvent

    val models = mapOf(
        "actor" to actorModel,
        "track-data" to trackDataModel,
        "diary" to diaryModel,
        "tracking" to trackingModel,
        "resep" to resepModel,
    )

    fun init(context: Context) {
        if (this::db.isInitialized) return

        val dbHelper = DbHelper(context)
        db = dbHelper.writableDatabase
    }

    fun getAll(storeName: String): String {
        val model = models[storeName] ?: throw Exception("No model $storeName")
        return gson.toJson(model.getAll(db))
    }

    fun get(storeName: String, id: String): String {
        val model = models[storeName] ?: throw Exception("No model $storeName")
        return gson.toJson(model.get(db, id))
    }

    fun insert(storeName: String, json: String, from: DataChangedFrom, clientId: String?) {
        when (storeName) {
            "actor" -> {
                val data = gson.fromJson(json, ActorData::class.java)
                actorModel.insert(db, data)
            }
            "track-data" -> {
                val data = gson.fromJson(json, TrackData::class.java)
                trackDataModel.insert(db, data)
            }
            "diary" -> {
                val data = gson.fromJson(json, DiaryData::class.java)
                diaryModel.insert(db, data)
            }
            "tracking" -> {
                val data = gson.fromJson(json, TrackingData::class.java)
                trackingModel.insert(db, data)
            }
            "resep" -> {
                val data = gson.fromJson(json, ResepData::class.java)
                resepModel.insert(db, data)
            }
            else -> throw Exception("No model $storeName")
        }

        _changedEvent.postValue(DataChangedEvent(from, storeName, clientId))
    }

    fun update(storeName: String, id: String, json: String, from: DataChangedFrom, clientId: String?) {
        when (storeName) {
            "actor" -> {
                val data = gson.fromJson(json, ActorData::class.java)
                actorModel.update(db, id, data)
            }
            "track-data" -> {
                val data = gson.fromJson(json, TrackData::class.java)
                trackDataModel.update(db, id, data)
            }
            "diary" -> {
                val data = gson.fromJson(json, DiaryData::class.java)
                diaryModel.update(db, id, data)
            }
            "tracking" -> {
                val data = gson.fromJson(json, TrackingData::class.java)
                trackingModel.update(db, id, data)
            }
            "resep" -> {
                val data = gson.fromJson(json, ResepData::class.java)
                resepModel.update(db, id, data)
            }
            else -> throw Exception("No model $storeName")
        }

        _changedEvent.postValue(DataChangedEvent(from, storeName, clientId))
    }

    fun delete(storeName: String, id: String, from: DataChangedFrom, clientId: String?) {
        val model = models[storeName] ?: throw Exception("No model $storeName")
        model.delete(db, id)

        _changedEvent.postValue(DataChangedEvent(from, storeName, clientId))
    }

    fun import(storeName: String, json: String, from: DataChangedFrom, clientId: String?) {
        when (storeName) {
            "actor" -> {
                val data: List<ActorData> = gson.fromJson(json, object : TypeToken<List<ActorData>>() {}.type)
                actorModel.import(db, data)
            }
            "track-data" -> {
                val data: List<TrackData> = gson.fromJson(json, object : TypeToken<List<TrackData>>() {}.type)
                trackDataModel.import(db, data)
            }
            "diary" -> {
                val data: List<DiaryData> = gson.fromJson(json, object : TypeToken<List<DiaryData>>() {}.type)
                diaryModel.import(db, data)
            }
            "tracking" -> {
                val data: List<TrackingData> = gson.fromJson(json, object : TypeToken<List<TrackingData>>() {}.type)
                trackingModel.import(db, data)
            }
            "resep" -> {
                val data: List<ResepData> = gson.fromJson(json, object : TypeToken<List<ResepData>>() {}.type)
                resepModel.import(db, data)
            }
            else -> throw Exception("No model $storeName")
        }

        _changedEvent.postValue(DataChangedEvent(from, storeName, clientId))
    }
}

class DbHelper(context: Context) : SQLiteOpenHelper(context, "data.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE actor (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE track_data (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                type TEXT NOT NULL,
                shape TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                editedAt TEXT NOT NULL
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE diary (
                id TEXT PRIMARY KEY,
                actor TEXT NOT NULL,
                date TEXT NOT NULL,
                content TEXT
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE tracking (
                id TEXT PRIMARY KEY,
                dataId TEXT NOT NULL,
                date TEXT NOT NULL,
                value TEXT NOT NULL,
                note TEXT,
                createdAt TEXT NOT NULL,
                editedAt TEXT NOT NULL
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE resep (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                bahans TEXT NOT NULL,
                tags TEXT NOT NULL,
                content TEXT
            )
        """.trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {

    }

}

class SingleLiveEvent<T> : MutableLiveData<T>() {
    private val pending = AtomicBoolean(false)

    override fun observe(owner: LifecycleOwner, observer: Observer<in T>) {
        super.observe(owner) { t ->
            if (pending.compareAndSet(true, false)) {
                observer.onChanged(t)
            }
        }
    }

    override fun setValue(value: T?) {
        pending.set(true)
        super.setValue(value)
    }
}