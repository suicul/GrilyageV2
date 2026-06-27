import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/providers/auth_provider.dart';
import 'core/services/push_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  // Set background message handler before runApp
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  runApp(
    const ProviderScope(
      child: _AutoLoginGate(),
    ),
  );
}

class _AutoLoginGate extends ConsumerStatefulWidget {
  const _AutoLoginGate();

  @override
  ConsumerState<_AutoLoginGate> createState() => _AutoLoginGateState();
}

class _AutoLoginGateState extends ConsumerState<_AutoLoginGate> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(authProvider.notifier).tryAutoLogin());
  }

  @override
  Widget build(BuildContext context) {
    return const CourierApp();
  }
}
