package com.tanim.maya;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MayaScreenshot")
public class MayaScreenshot extends Plugin {
    private boolean pending = false;
    @PluginMethod public void capture(PluginCall call) {
        if (Build.VERSION.SDK_INT < 29) { call.reject("Screenshots require Android 10 or newer."); return; }
        getActivity().runOnUiThread(() -> {
            String state = getContext().getSharedPreferences("maya_capture", 0).getString("status", "idle");
            long started = getContext().getSharedPreferences("maya_capture", 0).getLong("started", 0);
            if (pending || ("capturing".equals(state) && System.currentTimeMillis() - started < 30000)) {
                call.reject("A screenshot request is already active."); return;
            }
            try {
                pending = true;
                MediaProjectionManager manager = (MediaProjectionManager)getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
                startActivityForResult(call, manager.createScreenCaptureIntent(), "capturePermission");
            } catch (Exception e) { pending = false; call.reject("Cannot request screen capture.", e); }
        });
    }
    @ActivityCallback private void capturePermission(PluginCall call, ActivityResult result) {
        pending = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject r = new JSObject(); r.put("status", "cancelled"); call.resolve(r); return;
        }
        try {
            getContext().getSharedPreferences("maya_capture", 0).edit().putString("status", "capturing").putLong("started", System.currentTimeMillis()).putString("uri", "").apply();
            Intent intent = new Intent(getContext(), MayaCaptureService.class);
            intent.putExtra("resultCode", result.getResultCode()); intent.putExtra("data", result.getData());
            getContext().startForegroundService(intent);
            JSObject r = new JSObject(); r.put("status", "capturing"); call.resolve(r);
        } catch (Exception e) {
            getContext().getSharedPreferences("maya_capture", 0).edit().putString("status", "error").apply();
            call.reject("Screen capture could not start.", e);
        }
    }
    @PluginMethod public void status(PluginCall call) {
        android.content.SharedPreferences p = getContext().getSharedPreferences("maya_capture", 0);
        String state = p.getString("status", "idle");
        if ("capturing".equals(state) && System.currentTimeMillis() - p.getLong("started", 0) > 30000) state = "interrupted";
        JSObject r = new JSObject(); r.put("status", state); r.put("uri", p.getString("uri", "")); call.resolve(r);
    }
}
