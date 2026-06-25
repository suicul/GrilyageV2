import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'core/theme/theme.dart';
import 'core/storage/hive_service.dart';
import 'core/services/push_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  await Firebase.initializeApp();

  final hive = await HiveService.init();
  runApp(
    ProviderScope(
      overrides: [
        hiveServiceProvider.overrideWithValue(hive),
      ],
      child: const GrilyageApp(),
    ),
  );
}

class GrilyageApp extends ConsumerWidget {
  const GrilyageApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Грильяж',
      theme: GrilyageTheme.lightTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
