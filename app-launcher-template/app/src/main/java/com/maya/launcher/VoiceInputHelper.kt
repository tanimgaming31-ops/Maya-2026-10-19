package com.maya.launcher

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log

/**
 * স্পিচ-টু-টেক্সট ইনপুট — ভয়েস কমান্ডের প্রবেশদ্বার।
 * ডিভাইসে Google অ্যাপ / স্পিচ সার্ভিস থাকলে কাজ করে।
 */
class VoiceInputHelper(
    private val context: Context,
    private val onResult: (String?) -> Unit,
    private val onError: (String) -> Unit = {},
) {
    private var recognizer: SpeechRecognizer? = null

    fun isAvailable(): Boolean = SpeechRecognizer.isRecognitionAvailable(context)

    fun startListening() {
        if (!isAvailable()) {
            onError("এই ডিভাইসে স্পিচ রিকগনিশন সার্ভিস নেই")
            return
        }

        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
            setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onError(error: Int) {
                    onError("ভয়েস ইনপুট ব্যর্থ (error code: $error)")
                }
                override fun onResults(results: Bundle?) {
                    // গুরুত্বপূর্ণ: RecognitionListener-এ SpeechRecognizer.RESULTS_RECOGNITION কী
                    // (RecognizerIntent.EXTRA_RESULTS নয় — সেটি রিকগনিশন অ্যাক্টিভিটির রেজাল্টের)
                    val text = results
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull()
                    onResult(text)
                }
                override fun onPartialResults(partialResults: Bundle?) {}
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            )
            // চাইলে ডিফল্ট লোকেলে রেখে দিন; এখানে বাংলার উদাহরণ:
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "bn-BD")
        }
        recognizer?.startListening(intent)
    }

    fun destroy() {
        recognizer?.destroy()
        recognizer = null
    }

    companion object {
        private const val TAG = "VoiceInputHelper"
    }
}
