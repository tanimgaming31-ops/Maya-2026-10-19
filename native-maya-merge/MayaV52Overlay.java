package com.tanim.maya;

import android.animation.ObjectAnimator;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Maya-only native floating shortcut. Replaces the prior V5.2 miniature
 * buttons, not an independent assistant or a copied third-party avatar.
 * No microphone, recording, hidden screenshot or screen contents collection.
 * User must grant Android Display-over-other-apps permission.
 */
public final class MayaV52Overlay {
    private static WindowManager window;
    private static LinearLayout panel;
    private static WindowManager.LayoutParams params;
    private static ObjectAnimator pulse;
    private MayaV52Overlay() {}

    private static int dp(Context ctx, float n) {
        return Math.round(ctx.getResources().getDisplayMetrics().density*n);
    }
    private static TextView action(Context ctx, String text) {
        TextView v=new TextView(ctx);
        v.setText(text);v.setTextColor(Color.WHITE);
        v.setTextSize(15);v.setGravity(Gravity.CENTER);
        v.setContentDescription(text);
        v.setPadding(dp(ctx,8),dp(ctx,7),dp(ctx,8),dp(ctx,7));
        v.setClickable(true);v.setFocusable(true);
        return v;
    }
    private static void openMaya(Context ctx) {
        Intent launch=ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if(launch==null)return;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try { ctx.startActivity(launch); } catch(Exception ignored){}
    }
    static synchronized void show(Context input) {
        if(Build.VERSION.SDK_INT<26||!Settings.canDrawOverlays(input)||panel!=null)return;
        Context ctx=input.getApplicationContext();
        try {
            window=(WindowManager)ctx.getSystemService(Context.WINDOW_SERVICE);
            LinearLayout root=new LinearLayout(ctx);
            root.setOrientation(LinearLayout.VERTICAL);
            GradientDrawable bg=new GradientDrawable();
            bg.setColor(0xe916213b);bg.setCornerRadius(dp(ctx,22));
            bg.setStroke(dp(ctx,1),0xff52c6bb);
            root.setBackground(bg);root.setPadding(dp(ctx,5),dp(ctx,6),dp(ctx,5),dp(ctx,5));
            ImageView maya=new ImageView(ctx);
            maya.setImageDrawable(ctx.getPackageManager().getApplicationIcon(ctx.getApplicationInfo()));
            maya.setScaleType(ImageView.ScaleType.FIT_CENTER);
            maya.setContentDescription("Maya floating assistant. Tap to open Maya; drag to move.");
            maya.setClickable(true);
            root.addView(maya,new LinearLayout.LayoutParams(dp(ctx,70),dp(ctx,70)));
            TextView label=action(ctx,"Maya");
            label.setTextSize(14);root.addView(label,new LinearLayout.LayoutParams(dp(ctx,70),dp(ctx,28)));
            LinearLayout actions=new LinearLayout(ctx);
            actions.setOrientation(LinearLayout.HORIZONTAL);
            TextView screenshot=action(ctx,"📷");
            screenshot.setContentDescription("Request a screenshot with existing Maya permission");
            TextView close=action(ctx,"×");
            close.setContentDescription("Hide Maya floating shortcut");
            actions.addView(screenshot,new LinearLayout.LayoutParams(dp(ctx,37),dp(ctx,37)));
            actions.addView(close,new LinearLayout.LayoutParams(dp(ctx,33),dp(ctx,37)));
            root.addView(actions);
            params=new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
            params.gravity=Gravity.TOP|Gravity.START;
            params.x=dp(ctx,12);params.y=dp(ctx,240);
            // Only the user can drag this visible overlay; no hidden touches.
            maya.setOnTouchListener(new View.OnTouchListener(){
                private float downX,downY;private int startX,startY;private boolean dragged;
                @Override public boolean onTouch(View v,MotionEvent e){
                    if(e.getAction()==MotionEvent.ACTION_DOWN){
                        downX=e.getRawX();downY=e.getRawY();
                        startX=params.x;startY=params.y;dragged=false;return true;
                    }
                    if(e.getAction()==MotionEvent.ACTION_MOVE){
                        int x=(int)(e.getRawX()-downX),y=(int)(e.getRawY()-downY);
                        if(Math.abs(x)>dp(ctx,7)||Math.abs(y)>dp(ctx,7))dragged=true;
                        if(dragged){
                            params.x=Math.max(0,startX+x);params.y=Math.max(0,startY+y);
                            try{window.updateViewLayout(root,params);}catch(Exception ignored){}
                        }
                        return true;
                    }
                    if(e.getAction()==MotionEvent.ACTION_UP){
                        if(!dragged)openMaya(ctx);
                        return true;
                    }
                    return false;
                }
            });
            label.setOnClickListener(v->openMaya(ctx));
            screenshot.setOnClickListener(v->{
                // Existing Android Accessibility screenshot consent gate remains.
                MayaV52Capture.start(ctx);
                openMaya(ctx);
            });
            close.setOnClickListener(v->hide());
            window.addView(root,params);
            panel=root;
            pulse=ObjectAnimator.ofFloat(maya,View.ALPHA,1f,.72f,1f);
            pulse.setDuration(1700);
            pulse.setRepeatCount(ObjectAnimator.INFINITE);
            pulse.start();
        } catch(Exception ex){
            hide();
        }
    }
    static synchronized void hide() {
        if(pulse!=null){pulse.cancel();pulse=null;}
        if(panel!=null&&window!=null) {
            try{window.removeView(panel);}catch(Exception ignored){}
        }
        panel=null;params=null;window=null;
    }
}
