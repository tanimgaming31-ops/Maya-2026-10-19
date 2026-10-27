package com.tanim.maya;

import android.app.Activity;
import android.content.ContentValues;
import android.content.ContentResolver;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * User-selected single-frame paper scan, explicit 4-corner perspective correction.
 * Writes ONE page only to Downloads/Maya using Android MediaStore API 29+.
 * No legacy storage permission, no hidden camera, no background saving.
 */
public final class MayaDocumentPdf {
    private MayaDocumentPdf(){}
    private static JSONObject answer(String status,String note){
        JSONObject j=new JSONObject();
        try{j.put("status",status).put("message",note);}catch(Exception ignored){}
        return j;
    }
    private static String fail(String reason){return answer("error",reason).toString();}
    private static float[] points(JSONArray a,int width,int height)throws Exception{
        if(a==null||a.length()!=8)throw new IllegalArgumentException("Four paper corners are required.");
        float[] p=new float[8];
        for(int i=0;i<8;i++){
            double n=a.getDouble(i);
            if(!Double.isFinite(n)||n<0||n>1)throw new IllegalArgumentException("Corner outside image.");
            p[i]=(float)(n*(i%2==0?width:height));
        }
        // Reject almost empty, self-crossing or unordered corner polygons.
        float area=0;
        boolean positive=true;
        for(int k=0;k<4;k++){
            int n=(k+1)%4;
            area+=p[k*2]*p[n*2+1]-p[n*2]*p[k*2+1];
            int prior=(k+3)%4;
            float x1=p[k*2]-p[prior*2],y1=p[k*2+1]-p[prior*2+1];
            float x2=p[n*2]-p[k*2],y2=p[n*2+1]-p[k*2+1];
            float cross=x1*y2-y1*x2;
            if(k==0)positive=cross>0;
            if(Math.abs(cross)<width*height*.00008||((cross>0)!=positive))
                throw new IllegalArgumentException("Corners must form a convex paper shape in order.");
        }
        if(Math.abs(area)<width*height*.02)
            throw new IllegalArgumentException("Selected paper region is too small.");
        return p;
    }
    public static String run(Activity activity,String action,String raw){
        if(!"CREATE_PDF".equals(action))return fail("Unsupported document action.");
        if(activity==null||activity.isFinishing()||!activity.hasWindowFocus())
            return fail("Open Maya in the foreground before saving a PDF.");
        if(Build.VERSION.SDK_INT<29)return fail("PDF export to Downloads requires Android 10 or newer in this version.");
        Bitmap bitmap=null; PdfDocument pdf=null;Uri saved=null;
        try{
            JSONObject data=new JSONObject(raw==null?"{}":raw);
            String b64=data.optString("image","");
            if(b64.length()<100||b64.length()>3000000)return fail("Choose a smaller document image.");
            byte[] bytes=Base64.decode(b64,Base64.DEFAULT);
            if(bytes.length<100||bytes.length>2250000)return fail("Image exceeds size limit.");
            BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
            BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);
            if(bounds.outWidth<100||bounds.outHeight<100||bounds.outWidth>2400||bounds.outHeight>2400)
                return fail("Document image must be at least 100 px and no larger than 2400 px.");
            bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length);
            if(bitmap==null)return fail("Document image could not be decoded.");
            int width=bitmap.getWidth(),height=bitmap.getHeight();
            float[] src=points(data.optJSONArray("corners"),width,height);
            // A4 page in PDF points, leaving 20pt white margin.
            final int pageW=595,pageH=842;
            float edgeA=(float)Math.hypot(src[2]-src[0],src[3]-src[1]);
            float edgeB=(float)Math.hypot(src[4]-src[6],src[5]-src[7]);
            float edgeC=(float)Math.hypot(src[6]-src[0],src[7]-src[1]);
            float edgeD=(float)Math.hypot(src[4]-src[2],src[5]-src[3]);
            float aspect=(edgeA+edgeB)/(edgeC+edgeD);
            if(!(aspect>.2f&&aspect<5f))return fail("Selected paper corners have an unusual aspect ratio.");
            float cw=Math.min(555f,802f*aspect),ch=cw/aspect;
            if(ch>802f){ch=802f;cw=ch*aspect;}
            float x=(pageW-cw)/2,y=(pageH-ch)/2;
            float[] dst=new float[]{x,y,x+cw,y,x+cw,y+ch,x,y+ch};
            Matrix transform=new Matrix();
            if(!transform.setPolyToPoly(src,0,dst,0,4))return fail("Could not straighten the selected corners.");
            pdf=new PdfDocument();
            PdfDocument.Page page=pdf.startPage(new PdfDocument.PageInfo.Builder(pageW,pageH,1).create());
            Canvas canvas=page.getCanvas();canvas.drawColor(Color.WHITE);
            Paint brush=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
            canvas.save();
            canvas.clipRect(x,y,x+cw,y+ch);
            canvas.drawBitmap(bitmap,transform,brush);
            canvas.restore();
            pdf.finishPage(page);

            String name="Maya-Scan-"+new SimpleDateFormat("yyyyMMdd-HHmmss",Locale.US).format(new Date())+".pdf";
            ContentValues values=new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME,name);
            values.put(MediaStore.MediaColumns.MIME_TYPE,"application/pdf");
            values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Maya");
            values.put(MediaStore.MediaColumns.IS_PENDING,1);
            ContentResolver resolver=activity.getContentResolver();
            saved=resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
            if(saved==null)return fail("Android could not create the PDF in Downloads.");
            try(OutputStream out=resolver.openOutputStream(saved,"w")){
                if(out==null)throw new IllegalStateException("No writable PDF stream.");
                pdf.writeTo(out);
            }
            values.clear();values.put(MediaStore.MediaColumns.IS_PENDING,0);
            if(resolver.update(saved,values,null,null)<1)throw new IllegalStateException("PDF could not be published.");
            JSONObject ok=answer("ok","One-page PDF saved in Downloads/Maya.");
            ok.put("name",name);
            return ok.toString();
        }catch(Exception e){
            if(saved!=null)try{activity.getContentResolver().delete(saved,null,null);}catch(Exception ignored){}
            return fail("Unable to create PDF; verify photo corners, storage and permissions.");
        }finally{
            if(pdf!=null)try{pdf.close();}catch(Exception ignored){}
            if(bitmap!=null)bitmap.recycle();
        }
    }
}
