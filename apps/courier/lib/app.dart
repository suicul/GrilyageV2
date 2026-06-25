import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/orders_provider.dart';
import 'screens/login_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/order_detail_screen.dart';

class CourierApp extends ConsumerWidget {
  const CourierApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authStatus = ref.watch(authProvider);

    ref.listen<AuthStatus>(authProvider, (prev, next) {
      if (next == AuthStatus.authenticated) {
        final token = ref.read(authProvider.notifier).token;
        if (token != null) {
          ref.read(ordersProvider.notifier).connect(token);
        }
      } else if (next == AuthStatus.unauthenticated && prev == AuthStatus.authenticated) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (_) => false,
        );
      }
    });

    return MaterialApp(
      title: 'Грильяж — Курьер',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF20170F),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
      ),
      home: _buildHome(authStatus),
      onGenerateRoute: (settings) {
        if (settings.name?.startsWith('/order/') == true) {
          final orderId = settings.name!.substring(7);
          return MaterialPageRoute(
            builder: (_) => OrderDetailScreen(orderId: orderId),
          );
        }
        return null;
      },
    );
  }

  Widget _buildHome(AuthStatus status) {
    switch (status) {
      case AuthStatus.unknown:
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      case AuthStatus.authenticated:
        return const OrdersScreen();
      case AuthStatus.unauthenticated:
        return const LoginScreen();
    }
  }
}
