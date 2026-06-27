import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../providers/auth_provider.dart';

/// Global navigator key for routing from push notification taps.
final courierNotificationNavKey = GlobalKey<NavigatorState>();

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  final notifications = FlutterLocalNotificationsPlugin();
  final notification = message.notification;
  if (notification != null) {
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
        android: AndroidNotificationDetails(
          'orders',
          'Заказы',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: payload,
    );
  }
}

final pushServiceProvider = Provider<PushService?>((ref) {
  final api = ref.read(apiClientProvider);
  final service = PushService(api);
  service.init();

  ref.listen(authProvider, (prev, next) {
    if (next == AuthStatus.authenticated) {
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

  PushService(this._api) : _notifications = FlutterLocalNotificationsPlugin();

  /// Callback invoked when user taps a local notification.
  void Function(String? type, String? orderId)? onNotificationTap;

  Future<void> init() async {
    await _initLocalNotifications();
    await _initFirebase();
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
    // Firebase is already initialized in main()
    final messaging = FirebaseMessaging.instance;

    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    final fcmToken = await messaging.getToken();
    if (fcmToken != null) _pendingToken = fcmToken;

    messaging.onTokenRefresh.listen((t) {
      _pendingToken = t;
      registerPending();
    });

    const channel = AndroidNotificationChannel(
      'orders',
      'Заказы',
      description: 'Уведомления о новых заказах и смене статуса',
      importance: Importance.high,
    );

    await _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>()?.createNotificationChannel(channel);

    FirebaseMessaging.onMessage.listen((message) {
      final notification = message.notification;
      if (notification == null) return;
      final payload = message.data.isNotEmpty
          ? '${message.data['type']}|${message.data['orderId'] ?? ''}'
          : null;
      _showLocalNotification(
        notification.title,
        notification.body,
        payload: payload,
      );
    });
  }

  void _showLocalNotification(String? title, String? body, {String? payload}) {
    _notifications.show(
      title.hashCode,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'orders',
          'Заказы',
          importance: Importance.high,
          priority: Priority.high,
        ),
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
    } catch (_) {
      // Registration will be retried on next token refresh or auth
    }
  }

  Future<void> dispose() async {}
}
