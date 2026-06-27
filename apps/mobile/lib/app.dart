import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'core/theme/theme.dart';
import 'core/services/push_service.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/phone_otp_screen.dart';
import 'features/home/home_screen.dart';
import 'features/catalog/catalog_screen.dart';
import 'features/catalog/product_screen.dart';
import 'features/promotions/promotions_screen.dart';
import 'features/cart/cart_screen.dart';
import 'features/cart/checkout_screen.dart';
import 'features/cart/providers.dart';
import 'features/profile/profile_screen.dart';
import 'features/profile/addresses_screen.dart';
import 'features/profile/about_screen.dart';
import 'features/orders/orders_screen.dart';
import 'features/orders/tracking_screen.dart';
import 'features/map/map_screen.dart';
import 'features/chat/chat_screen.dart';
import 'features/call/call_screen.dart';
import 'widgets/offline_indicator.dart';
import 'features/catalog/providers.dart';

/// Firebase Analytics instance for screen tracking and events.
final analyticsProvider = Provider<FirebaseAnalytics>((ref) => FirebaseAnalytics.instance);

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final analytics = ref.watch(analyticsProvider);
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    observers: [AnalyticsObserver(analytics)],
    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => _MainShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/menu', builder: (_, __) => const CatalogScreen()),
          GoRoute(path: '/promotions', builder: (_, __) => const PromotionsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const PhoneInputScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/auth-social',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>;
          return SocialAuthScreen(provider: extra['provider'] as String);
        },
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/auth-email-otp',
        builder: (_, __) => const EmailOtpScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/auth-phone-otp',
        builder: (_, __) => const PhoneOtpScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/auth-telegram',
        builder: (_, __) => const TelegramAuthScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/auth-code',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>;
          return CodeInputScreen(
            codeId: extra['codeId'] as String,
            phone: extra['phone'] as String,
            code: extra['code'] as int?,
            name: extra['name'] as String? ?? '',
          );
        },
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/category/:slug',
        builder: (_, state) {
          final slug = state.pathParameters['slug']!;
          return _CategoryProductList(slug: slug);
        },
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/product/:slug',
        builder: (_, state) {
          final slug = state.pathParameters['slug']!;
          return ProductScreen(slug: slug);
        },
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/cart',
        builder: (_, __) => const CartScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/checkout',
        builder: (_, __) => const CheckoutScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/order-success',
        builder: (_, state) {
          final order = state.extra as Map<String, dynamic>;
          return OrderSuccessScreen(order: order);
        },
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/orders',
        builder: (_, __) => const OrdersScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/tracking/:orderId',
        builder: (_, state) {
          final orderId = state.pathParameters['orderId']!;
          return TrackingScreen(orderId: orderId);
        },
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/map',
        builder: (_, __) => const MapScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/addresses',
        builder: (_, __) => const AddressesScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/about',
        builder: (_, __) => const AboutScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/chat',
        builder: (_, __) => const ChatScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
      GoRoute(
        path: '/call',
        builder: (_, __) => const CallScreen(),
        parentNavigatorKey: _rootNavigatorKey,
      ),
    ],
  );
});

class _MainShell extends ConsumerWidget {
  final Widget child;
  const _MainShell({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pushService = ref.watch(pushServiceProvider);
    pushService?.onNotificationTap = (type, orderId) {
      if (type == 'order.status' || type == 'order.new') {
        context.push('/orders');
      }
    };
    final cartCount = ref.watch(cartProvider.select((s) => s.count));

    return Scaffold(
      body: Stack(
        children: [
          child,
          const Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: OfflineIndicator(),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _calcIndex(context),
        onTap: (i) => _onTap(i, context),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Главная'),
          BottomNavigationBarItem(icon: Icon(Icons.menu_book_outlined), activeIcon: Icon(Icons.menu_book), label: 'Меню'),
          BottomNavigationBarItem(icon: Icon(Icons.local_offer_outlined), activeIcon: Icon(Icons.local_offer), label: 'Акции'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Профиль'),
        ],
      ),
      floatingActionButton: cartCount > 0
          ? FloatingActionButton(
              onPressed: () => context.push('/cart'),
              backgroundColor: GrilyageTheme.gold,
              foregroundColor: Colors.white,
              child: Badge(
                isLabelVisible: true,
                label: Text('$cartCount'),
                child: const Icon(Icons.shopping_bag),
              ),
            )
          : null,
    );
  }

  int _calcIndex(BuildContext context) {
    final loc = GoRouterState.of(context).uri.toString();
    if (loc.startsWith('/menu')) return 1;
    if (loc.startsWith('/promotions')) return 2;
    if (loc.startsWith('/profile')) return 3;
    return 0;
  }

  void _onTap(int i, BuildContext context) {
    switch (i) {
      case 0: context.go('/');
      case 1: context.go('/menu');
      case 2: context.go('/promotions');
      case 3: context.go('/profile');
    }
  }
}

class _CategoryProductList extends ConsumerWidget {
  final String slug;
  const _CategoryProductList({required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(categoryProvider(slug));
    return Scaffold(
      appBar: AppBar(title: Text(products.isNotEmpty ? products.first.categoryName : slug)),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: products.length,
        itemBuilder: (context, i) {
          final p = products[i];
          return Card(
            child: InkWell(
              onTap: () => context.push('/product/${p.slug}'),
              borderRadius: BorderRadius.circular(20),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: p.imageUrl != null && p.imageUrl!.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: p.imageUrl!,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              placeholder: (_, __) => Container(color: GrilyageTheme.border),
                              errorWidget: (_, __, ___) => Icon(Icons.image,
                                color: GrilyageTheme.gold.withValues(alpha: 0.3), size: 48),
                            )
                          : Icon(Icons.image, color: GrilyageTheme.gold.withValues(alpha: 0.3), size: 48),
                    ),
                  ),
                    Text(p.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(p.priceFormatted, style: const TextStyle(
                      color: GrilyageTheme.gold, fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Observes navigation events and logs screen views to Firebase Analytics.
class AnalyticsObserver extends NavigatorObserver {
  final FirebaseAnalytics analytics;

  AnalyticsObserver(this.analytics);

  @override
  void didPush(Route route, Route? previousRoute) {
    super.didPush(route, previousRoute);
    _logScreen(route);
  }

  @override
  void didReplace({Route? newRoute, Route? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) _logScreen(newRoute);
  }

  @override
  void didPop(Route route, Route? previousRoute) {
    super.didPop(route, previousRoute);
    if (previousRoute != null) _logScreen(previousRoute);
  }

  void _logScreen(Route route) {
    final name = route.settings.name ?? route.runtimeType.toString();
    analytics.logScreenView(
      screenName: name,
      screenClass: route.runtimeType.toString(),
    );
  }
}
