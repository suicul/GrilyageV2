import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/providers/auth_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
