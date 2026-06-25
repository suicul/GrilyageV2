import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_rustore_push/flutter_rustore_push.dart' as rustore;
import 'package:flutter_rustore_push/pigeons/rustore_push.dart' as pigeons;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/providers.dart';
import '../api/client.dart';
import '../../features/auth/providers.dart';

/// Global key used to navigate from a background notification tap.
final notificationNavKey = GlobalKey<NavigatorState>();

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final notifications = FlutterLocalNotificationsPlugin();
  final notification = message.notification;
  if (notification != null) {
    // Serialize data into payload so tap handler can route
    final payload = message.data.isNotEmpty
        ? '${message.data['type']}|${message.data['orderId'] ?? ''}'
        : null;
    await notifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
    );
    await notifications.show(
      notification.title.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails('orders', 'Заказы',
          importance: Importance.high, priority: Priority.high),
      ),
      payload: payload,
    );
  }
}

final pushServiceProvider = Provider<PushService?>((ref) {
  final api = ref.read(apiClientProvider);
  final service = PushService(api);
  service.init();

  ref.listen(authStateProvider, (prev, next) {
    if (next.isAuthenticated) {
      service.registerPending();
    }
  });

  ref.onDispose(() => service.dispose());
  return service;
});

class PushService {
  final ApiClient _api;
  final FlutterLocalNotificationsPlugin _notifications;
  String? _pendingToken;

  PushService(this._api)
    : _notifications = FlutterLocalNotificationsPlugin();

  /// Callback invoked when user taps a local notification.
  void Function(String? type, String? orderId)? onNotificationTap;

  Future<void> init() async {
    await _initLocalNotifications();
    await _initFirebase();
    await _initRuStore();
  }

  Future<void> _initLocalNotifications() async {
    await _notifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null) return;
        final parts = payload.split('|');
        onNotificationTap?.call(
          parts.isNotEmpty ? parts[0] : null,
          parts.length > 1 ? parts[1] : null,
        );
      },
    );
  }

  Future<void> registerPending() async {
    if (_pendingToken == null) return;
    await _register(_pendingToken!);
    _pendingToken = null;
  }

  Future<void> _initFirebase() async {
    final messaging = FirebaseMessaging.instance;

    await messaging.requestPermission(
      alert: true, badge: true, sound: true,
    );

    final fcmToken = await messaging.getToken();
    if (fcmToken != null) _pendingToken = fcmToken;

    messaging.onTokenRefresh.listen((t) {
      _pendingToken = t;
      registerPending();
    });

    const channel = AndroidNotificationChannel(
      'orders', 'Заказы',
      description: 'Уведомления о статусе заказа',
      importance: Importance.high,
    );

    await _notifications.resolvePlatformSpecificImplementation<
      AndroidFlutterLocalNotificationsPlugin
    >()?.createNotificationChannel(channel);

    FirebaseMessaging.onMessage.listen((message) {
      final notification = message.notification;
      if (notification == null) return;
      final payload = message.data.isNotEmpty
          ? '${message.data['type']}|${message.data['orderId'] ?? ''}'
          : null;
      _showLocalNotification(
        notification.title, notification.body, payload: payload);
    });
  }

  Future<void> _initRuStore() async {
    try {
      final available = await rustore.RustorePushClient.available();
      if (!available) return;

      final ruStoreToken = await rustore.RustorePushClient.getToken();
      if (ruStoreToken.isNotEmpty) await _register(ruStoreToken);

      await rustore.RustorePushClient.attachCallbacks(
        onNewToken: (token) {
          _pendingToken = token as String;
          registerPending();
        },
        onMessageReceived: (message) {
          final msg = message as pigeons.Message?;
          if (msg?.notification != null) {
            _showLocalNotification(
              msg!.notification!.title, msg.notification!.body,
            );
          }
        },
      );
    } catch (_) {}
  }

  void _showLocalNotification(String? title, String? body, {String? payload}) {
    _notifications.show(
      title.hashCode,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails('orders', 'Заказы',
          importance: Importance.high, priority: Priority.high),
      ),
      payload: payload,
    );
  }

  Future<void> _register(String token) async {
    try {
      await _api.post('/push/register', data: {
        'token': token,
        'platform': 'android',
      });
    } catch (_) {}
  }

  Future<void> dispose() async {
    try { await rustore.RustorePushClient.deleteToken(); } catch (_) {}
  }
}
