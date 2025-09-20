package com.grtlab.mydiary

import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.Observer
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.reflect.TypeToken
import java.util.concurrent.atomic.AtomicBoolean

private val gson = Gson()

data class WebEvent(
    val kind: String,
    val storeName: String,
    val data: String?
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

object WebRepo {
    private val _event = SingleLiveEvent<WebEvent>()
    val event: LiveData<WebEvent> get() = _event

    private val _actorData = mutableListOf<ActorData>()
    private val _trackData = mutableListOf<TrackData>()
    private val _diaryData = mutableListOf<DiaryData>()
    private val _trackingData = mutableListOf<TrackingData>()

    private var _actorTime = 0L
    private var _trackTime = 0L
    private var _diaryTime = 0L
    private var _trackingTime = 0L

    fun pushEvent(d: WebEvent, fromAndroid: Boolean = false) {
        if (d.kind == "put") {
            when (d.storeName) {
                "actor" -> {
                    val data = gson.fromJson(d.data, ActorData::class.java)
                    val index = _actorData.indexOfFirst { it.id == data.id }

                    if (index < 0) {
                        _actorData.add(data)
                    }
                    else {
                        _actorData[index] = data
                    }

                    _actorTime = System.nanoTime()
                }
                "track-data" -> {
                    val data = gson.fromJson(d.data, TrackData::class.java)
                    val index = _trackData.indexOfFirst { it.id == data.id }

                    if (index < 0) {
                        _trackData.add(data)
                    }
                    else {
                        _trackData[index] = data
                    }

                    _trackTime = System.nanoTime()
                }
                "diary" -> {
                    val data = gson.fromJson(d.data, DiaryData::class.java)
                    val index = _diaryData.indexOfFirst { it.id == data.id }

                    if (index < 0) {
                        _diaryData.add(data)
                    }
                    else {
                        _diaryData[index] = data
                    }

                    _diaryTime = System.nanoTime()
                }
                "tracking" -> {
                    val data = gson.fromJson(d.data, TrackingData::class.java)
                    val index = _trackingData.indexOfFirst { it.id == data.id }

                    if (index < 0) {
                        _trackingData.add(data)
                    }
                    else {
                        _trackingData[index] = data
                    }

                    _trackingTime = System.nanoTime()
                }
            }
        }
        else if (d.kind == "delete") {
            when (d.storeName) {
                "actor" -> {
                    val index = _actorData.indexOfFirst { it.id == d.data }

                    if (index >= 0) {
                        _actorData.removeAt(index)
                        _actorTime = System.nanoTime()
                    }
                }
                "track-data" -> {
                    val index = _trackData.indexOfFirst { it.id == d.data }

                    if (index >= 0) {
                        _trackData.removeAt(index)
                        _trackTime = System.nanoTime()
                    }
                }
                "diary" -> {
                    val index = _diaryData.indexOfFirst { it.id == d.data }

                    if (index >= 0) {
                        _diaryData.removeAt(index)
                        _diaryTime = System.nanoTime()
                    }
                }
                "tracking" -> {
                    val index = _trackingData.indexOfFirst { it.id == d.data }

                    if (index >= 0) {
                        _trackingData.removeAt(index)
                        _trackingTime = System.nanoTime()
                    }
                }
            }
        }

        if (!fromAndroid) {
            _event.postValue(d)
        }
    }

    fun setData(storeName: String, data: String): String? {
        var res: String? = null

        when (storeName) {
            "actor" -> {
                if (_actorTime == 0L) {
                    _actorData.clear()
                    _actorData.addAll(gson.fromJson(data, object : TypeToken<List<ActorData>>() {}.type))
                    _actorTime = System.nanoTime()
                }
                else {
                    res = gson.toJson(_actorData)
                }
            }
            "track-data" -> {
                if (_trackTime == 0L) {
                    _trackData.clear()
                    _trackData.addAll(gson.fromJson(data, object : TypeToken<List<TrackData>>() {}.type))
                    _trackTime = System.nanoTime()
                }
                else {
                    res = gson.toJson(_trackData)
                }
            }
            "diary" -> {
                if (_diaryTime == 0L) {
                    _diaryData.clear()
                    _diaryData.addAll(gson.fromJson(data, object : TypeToken<List<DiaryData>>() {}.type))
                    _diaryTime = System.nanoTime()
                }
                else {
                    res = gson.toJson(_diaryData)
                }
            }
            "tracking" -> {
                if (_trackingTime == 0L) {
                    _trackingData.clear()
                    _trackingData.addAll(gson.fromJson(data, object : TypeToken<List<TrackingData>>() {}.type))
                    _trackingTime = System.nanoTime()
                }
                else {
                    res = gson.toJson(_trackingData)
                }
            }
        }

        return res
    }

    fun getDataAll(storeName: String): String {
        return when (storeName) {
            "actor" -> gson.toJson(_actorData)
            "track-data" -> gson.toJson(_trackData)
            "diary" -> gson.toJson(_diaryData)
            "tracking" -> gson.toJson(_trackingData)
            else -> "[]"
        }
    }

    fun getDataSingle(storeName: String, id: String): String {
        return when (storeName) {
            "actor" -> gson.toJson(_actorData.find { it.id == id })
            "track-data" -> gson.toJson(_trackData.find { it.id == id })
            "diary" -> gson.toJson(_diaryData.find { it.id == id })
            "tracking" -> gson.toJson(_trackingData.find { it.id == id })
            else -> "{}"
        }
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