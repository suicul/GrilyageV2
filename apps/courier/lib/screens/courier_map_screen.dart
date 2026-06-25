import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yandex_mapkit/yandex_mapkit.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/models/order.dart';
import '../core/providers/orders_provider.dart';

/// Cafe / restaurant coordinates
const _cafeLat = 54.9893;
const _cafeLng = 73.3682;

class CourierMapScreen extends ConsumerStatefulWidget {
  const CourierMapScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<CourierMapScreen> createState() => _CourierMapScreenState();
}

class _CourierMapScreenState extends ConsumerState<CourierMapScreen> {
  YandexMapController? _mapController;
  final MapObjectId _cafeMarkerId = const MapObjectId('cafe');
  final MapObjectId _courierMarkerId = const MapObjectId('courier');
  double? _courierLat;
  double? _courierLng;
  StreamSubscription<Position>? _positionSubscription;
  bool _locationError = false;

  @override
  void initState() {
    super.initState();
    _startGpsTracking();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    super.dispose();
  }

  Future<void> _startGpsTracking() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() => _locationError = true);
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        setState(() => _locationError = true);
        return;
      }

      // Get initial position
      final pos = await Geolocator.getCurrentPosition();
      setState(() {
        _courierLat = pos.latitude;
        _courierLng = pos.longitude;
      });

      // Listen to position updates
      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10, // update every 10 meters
        ),
      ).listen((pos) {
        setState(() {
          _courierLat = pos.latitude;
          _courierLng = pos.longitude;
        });
      });
    } catch (_) {
      setState(() => _locationError = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(ordersProvider);
    final order = ordersAsync.whenOrNull(
      data: (orders) => orders.where((o) => o.id == widget.orderId).firstOrNull,
    );

    if (order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Маршрут')),
        body: const Center(child: Text('Заказ не найден')),
      );
    }

    final addressText =
        '${order.address.street}, ${order.address.building}${order.address.apartment != null ? ", кв. ${order.address.apartment}" : ""}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Маршрут доставки'),
        actions: [
          if (_courierLat != null && _courierLng != null)
            IconButton(
              icon: const Icon(Icons.my_location),
              onPressed: _centerOnCourier,
              tooltip: 'Моё местоположение',
            ),
        ],
      ),
      body: Column(
        children: [
          // Info bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Theme.of(context).colorScheme.primaryContainer,
            child: Row(
              children: [
                const Icon(Icons.store, size: 18),
                const SizedBox(width: 8),
                const Text('Грильяж', style: TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Icon(Icons.arrow_forward, size: 16, color: Colors.grey[600]),
                const Spacer(),
                const Icon(Icons.location_on, size: 18, color: Colors.red),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    addressText,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
          ),

          // Location error banner
          if (_locationError)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              color: Colors.orange.shade100,
              child: const Row(
                children: [
                  Icon(Icons.warning_amber, size: 16, color: Colors.orange),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Не удалось определить местоположение. Проверьте разрешения GPS.',
                      style: TextStyle(fontSize: 12, color: Colors.orange),
                    ),
                  ),
                ],
              ),
            ),

          // Map
          Expanded(
            child: YandexMap(
              onMapCreated: (controller) async {
                _mapController = controller;
                _setupMap(order);
              },
              mapObjects: _buildMapObjects(order),
            ),
          ),

          // Bottom info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Клиент: ${order.customerName}',
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text(order.customerPhone,
                            style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                      ],
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: _openInNavigator,
                    icon: const Icon(Icons.navigation, size: 18),
                    label: const Text('Проложить'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<MapObject> _buildMapObjects(Order order) {
    final objects = <MapObject>[
      // Cafe marker — gold pin
      PlacemarkMapObject(
        mapId: _cafeMarkerId,
        point: Point(latitude: _cafeLat, longitude: _cafeLng),
        opacity: 1,
        icon: PlacemarkIcon.single(
          PlacemarkIconStyle(
            image: BitmapDescriptor.fromColoredRectangle(
              width: 24,
              height: 24,
              color: const Color(0xFFD6B06A),
            ),
            scale: 1,
          ),
        ),
        text: const PlacemarkText(
          text: 'Грильяж',
          style: PlacemarkTextStyle(
            size: 14,
            color: Color(0xFFD6B06A),
          ),
        ),
      ),
    ];

    // Courier marker (if location available) — blue dot
    if (_courierLat != null && _courierLng != null) {
      objects.add(
        PlacemarkMapObject(
          mapId: _courierMarkerId,
          point: Point(latitude: _courierLat!, longitude: _courierLng!),
          opacity: 1,
          icon: PlacemarkIcon.single(
            PlacemarkIconStyle(
              image: BitmapDescriptor.fromColoredRectangle(
                width: 20,
                height: 20,
                color: const Color(0xFF1565C0),
              ),
              scale: 1,
            ),
          ),
          text: const PlacemarkText(
            text: 'Я',
            style: PlacemarkTextStyle(size: 12, color: Color(0xFF1565C0)),
          ),
        ),
      );
    }

    return objects;
  }

  Future<void> _setupMap(Order order) async {
    if (_mapController == null) return;

    // Center on cafe initially, showing both cafe and delivery area
    await _mapController!.moveCamera(
      CameraUpdate.newCameraPosition(
        const CameraPosition(
          target: Point(latitude: _cafeLat, longitude: _cafeLng),
          zoom: 14,
        ),
      ),
      animation: const MapAnimation(duration: 0.5),
    );
  }

  Future<void> _centerOnCourier() async {
    if (_mapController == null || _courierLat == null || _courierLng == null) return;
    await _mapController!.moveCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: Point(latitude: _courierLat!, longitude: _courierLng!),
          zoom: 16,
        ),
      ),
      animation: const MapAnimation(duration: 0.3),
    );
  }

  Future<void> _openInNavigator() async {
    final address = '${order.address.street}, ${order.address.building}';
    final addressEncoded = Uri.encodeComponent(address);

    // Yandex Maps: route from cafe to delivery address
    final uri = Uri.parse(
      'https://yandex.ru/maps/?rtext=$_cafeLat,$_cafeLng~$addressEncoded',
    );

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) throw Exception('Could not launch');
    } catch (_) {
      // Fallback: simple address search
      try {
        final fallbackUri = Uri.parse(
          'https://yandex.ru/maps/?text=$addressEncoded',
        );
        await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
      } catch (_) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Не удалось открыть навигатор')),
        );
      }
    }
  }

  @override
  void dispose() {
    _mapController = null;
    super.dispose();
  }
}


