import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yandex_mapkit/yandex_mapkit.dart';
import '../../core/theme/theme.dart';
import 'tracking_socket.dart';

const _cafeLat = 54.9893;
const _cafeLng = 73.3682;

class TrackingScreen extends ConsumerStatefulWidget {
  final String orderId;

  const TrackingScreen({super.key, required this.orderId});

  @override
  ConsumerState<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends ConsumerState<TrackingScreen> {
  final _mapController = Completer<YandexMapController>();
  CourierInfo? _courierInfo;
  double? _courierLat;
  double? _courierLng;
  bool _loading = true;
  StreamSubscription<CourierLocation>? _locationSub;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _subscribeToLocation();
  }

  @override
  void dispose() {
    _locationSub?.cancel();
    super.dispose();
  }

  void _subscribeToLocation() {
    final socket = ref.read(userOrdersSocketProvider);
    socket.connect();
    socket.subscribeToOrder(widget.orderId);

    _locationSub = socket.courierLocationStream.listen((loc) {
      if (!mounted) return;
      setState(() {
        _courierLat = loc.latitude;
        _courierLng = loc.longitude;
      });
      _moveCameraToCourier(loc.latitude, loc.longitude);
    });
  }

  Future<void> _loadInitialData() async {
    final socket = ref.read(userOrdersSocketProvider);
    final info = await socket.fetchCourierInfo(widget.orderId);
    if (mounted) {
      setState(() {
        _courierInfo = info;
        if (info != null) {
          _courierLat = info.latitude;
          _courierLng = info.longitude;
        }
        _loading = false;
      });
      _moveCameraToFit();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Заказ #${widget.orderId.split('-').first}'),
        actions: [
          if (_courierInfo != null)
            _buildCourierInfoChip(),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                _buildMap(),
                if (_courierInfo != null)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 24,
                    child: _buildCourierCard(),
                  )
                else
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 24,
                    child: _buildNoCourierCard(),
                  ),
              ],
            ),
    );
  }

  Widget _buildMap() {
    final objects = <MapObject>[
      PlacemarkMapObject(
        mapId: const MapObjectId('cafe'),
        point: Point(latitude: _cafeLat, longitude: _cafeLng),
        opacity: 1,
        icon: PlacemarkIcon.single(
          PlacemarkIconStyle(
            image: BitmapDescriptor.fromAssetImage('assets/marker.png'),
            scale: 0.3,
          ),
        ),
        text: const PlacemarkText(
          text: 'Грильяж',
          style: PlacemarkTextStyle(size: 14, color: Color(0xFFD6B06A)),
        ),
      ),
    ];

    if (_courierLat != null && _courierLng != null) {
      objects.add(
        PlacemarkMapObject(
          mapId: const MapObjectId('courier'),
          point: Point(latitude: _courierLat!, longitude: _courierLng!),
          opacity: 1,
          icon: PlacemarkIcon.single(
            PlacemarkIconStyle(
              image: BitmapDescriptor.fromAssetImage('assets/marker.png'),
              scale: 0.35,
            ),
          ),
          text: PlacemarkText(
            text: _courierInfo?.name ?? 'Курьер',
            style: const PlacemarkTextStyle(size: 14, color: Color(0xFF4A9EFF)),
          ),
        ),
      );
    }

    return YandexMap(
      mapObjects: objects,
      onMapCreated: (controller) {
        _mapController.complete(controller);
        _moveCameraToFit();
      },
    );
  }

  Widget _buildCourierCard() {
    final transportIcon = _courierInfo!.transportType == 'CAR'
        ? Icons.directions_car
        : _courierInfo!.transportType == 'BIKE'
            ? Icons.pedal_bike
            : Icons.directions_walk;

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(transportIcon, color: GrilyageTheme.gold, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _courierInfo!.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                Icon(Icons.my_location, color: GrilyageTheme.gold.withValues(alpha: 0.7)),
                const SizedBox(width: 4),
                Text(
                  _courierInfo!.transportLabel,
                  style: const TextStyle(color: GrilyageTheme.textMuted, fontSize: 13),
                ),
              ],
            ),
            if (_courierLat != null && _courierLng != null) ...[
              const SizedBox(height: 8),
              Text(
                'Курьер в пути',
                style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w500),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNoCourierCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.access_time, color: GrilyageTheme.gold, size: 28),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Курьер ещё не назначен',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
              ),
            ),
            SizedBox(
              width: 20, height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCourierInfoChip() {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Chip(
        avatar: const Icon(Icons.local_shipping, size: 18),
        label: Text(_courierInfo!.name),
        backgroundColor: GrilyageTheme.gold.withValues(alpha: 0.15),
      ),
    );
  }

  Future<void> _moveCameraToFit() async {
    try {
      final controller = await _mapController.future;
      if (_courierLat != null && _courierLng != null) {
        // Center between cafe and courier with reasonable zoom
        final centerLat = (_cafeLat + _courierLat!) / 2;
        final centerLng = (_cafeLng + _courierLng!) / 2;
        final dLat = (_cafeLat - _courierLat!).abs();
        final dLng = (_cafeLng - _courierLng!).abs();
        final zoom = dLat > 0.02 || dLng > 0.02 ? 12.0 : 14.0;

        await controller.moveCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(
              target: Point(latitude: centerLat, longitude: centerLng),
              zoom: zoom,
            ),
          ),
        );
      } else {
        await controller.moveCamera(
          CameraUpdate.newCameraPosition(
            const CameraPosition(
              target: Point(latitude: _cafeLat, longitude: _cafeLng),
              zoom: 15,
            ),
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _moveCameraToCourier(double lat, double lng) async {
    try {
      final controller = await _mapController.future;
      await controller.moveCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: Point(latitude: lat, longitude: lng),
            zoom: 15,
          ),
        ),
      );
    } catch (_) {}
  }
}
