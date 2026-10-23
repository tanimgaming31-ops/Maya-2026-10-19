package com.tanim.maya;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.graphics.*;
import android.hardware.display.*;
import android.media.*;
import android.media.projection.*;
import android.net.Uri;
import android.os.*;
import android.provider.MediaStore;
import android.util.DisplayMetrics;
import android.view.WindowManager;
import java.io.OutputStream;

public class MayaCaptureService extends Service {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaProjection projection;
    private VirtualDisplay display;
    private ImageReader reader;
    private boolean finished = false;
    private long readyAt;
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (projection != null) return START_NOT_STICKY;
        try {
            if (Build.VERSION.SDK_INT < 29) throw new IllegalStateException("Android 10+ required");
            NotificationManager nm = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            nm.createNotificationChannel(new NotificationChannel("maya_capture", "Maya screen capture", NotificationManager.IMPORTANCE_LOW));
            Notification n = new Notification.Builder(this, "maya_capture").setSmallIcon(android.R.drawable.ic_menu_camera).setContentTitle("Maya screenshot").setContentText("Capturing after a short delay; protected content may be blank.").setOngoing(true).build();
            startForeground(9132, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            if (intent == null) throw new IllegalStateException("Missing capture permission");
            Intent data = intent.getParcelableExtra("data");
            if (data == null) throw new IllegalStateException("Missing capture consent");
            projection = ((MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE)).getMediaProjection(intent.getIntExtra("resultCode", 0), data);
            projection.registerCallback(new MediaProjection.Callback() {
                @Override public void onStop() { finish("cancelled", ""); }
            }, handler);
            DisplayMetrics m = new DisplayMetrics();
            ((WindowManager)getSystemService(WINDOW_SERVICE)).getDefaultDisplay().getRealMetrics(m);
            reader = ImageReader.newInstance(m.widthPixels, m.heightPixels, PixelFormat.RGBA_8888, 2);
            readyAt = SystemClock.elapsedRealtime() + 3000;
            reader.setOnImageAvailableListener(this::imageReady, handler);
            display = projection.createVirtualDisplay("MayaScreenshot", m.widthPixels, m.heightPixels, m.densityDpi, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader.getSurface(), null, handler);
            handler.postDelayed(() -> finish("timeout", ""), 20000);
        } catch (Exception e) { finish("error", ""); }
        return START_NOT_STICKY;
    }
    private void imageReady(ImageReader source) {
        if (finished) return;
        Image image = null;
        Bitmap padded = null, cropped = null;
        Uri uri = null;
        try {
            image = source.acquireLatestImage();
            if (image == null || SystemClock.elapsedRealtime() < readyAt) return;
            Image.Plane p = image.getPlanes()[0];
            int width = image.getWidth(), height = image.getHeight();
            int padding = p.getRowStride() - p.getPixelStride() * width;
            padded = Bitmap.createBitmap(width + padding / p.getPixelStride(), height, Bitmap.Config.ARGB_8888);
            padded.copyPixelsFromBuffer(p.getBuffer());
            cropped = Bitmap.createBitmap(padded, 0, 0, width, height);
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "Maya-" + System.currentTimeMillis() + ".png");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Maya");
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
            uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("Gallery unavailable");
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null || !cropped.compress(Bitmap.CompressFormat.PNG, 100, out)) throw new IllegalStateException("PNG save failed");
            }
            ContentValues done = new ContentValues(); done.put(MediaStore.Images.Media.IS_PENDING, 0);
            if (getContentResolver().update(uri, done, null, null) < 1) throw new IllegalStateException("Gallery publish failed");
            finish("saved", uri.toString());
        } catch (Exception e) {
            if (uri != null) try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
            finish("error", "");
        } finally {
            if (image != null) image.close();
            if (cropped != null && cropped != padded) cropped.recycle();
            if (padded != null) padded.recycle();
        }
    }
    private void finish(String status, String uri) {
        if (finished) return;
        finished = true;
        getSharedPreferences("maya_capture", 0).edit().putString("status", status).putString("uri", uri).apply();
        cleanup(); stopForeground(true); stopSelf();
    }
    private void cleanup() {
        handler.removeCallbacksAndMessages(null);
        if (display != null) { display.release(); display = null; }
        if (reader != null) { reader.setOnImageAvailableListener(null, null); reader.close(); reader = null; }
        if (projection != null) { MediaProjection p = projection; projection = null; p.stop(); }
    }
    @Override public void onDestroy() { finished = true; cleanup(); super.onDestroy(); }
}
