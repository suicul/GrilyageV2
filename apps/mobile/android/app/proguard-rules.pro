# Flutter specific
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Keep Dio serialization
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep Riverpod
-dontwarn riverpod.**

# Keep Firebase
-keep class com.google.firebase.** { *; }

# Play Core (split compat)
-dontwarn com.google.android.play.core.**
-keep class com.google.android.play.core.** { *; }

# RuStore Push
-keep public class com.vk.push.** extends android.os.Parcelable
