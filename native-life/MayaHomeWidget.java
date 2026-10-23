package com.tanim.maya;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** Small, real Android home-screen widget. Only opens Maya, never background-records. */
public final class MayaHomeWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id:ids) {
            Intent launch=new Intent(c,MainActivity.class);
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pending=PendingIntent.getActivity(c,5000+id,launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            RemoteViews view=new RemoteViews(c.getPackageName(),R.layout.maya_home_widget);
            view.setOnClickPendingIntent(R.id.maya_widget_open,pending);
            m.updateAppWidget(id,view);
        }
    }
}
