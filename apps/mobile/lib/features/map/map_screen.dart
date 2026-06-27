import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:yandex_mapkit/yandex_mapkit.dart';
import '../../core/theme/theme.dart';

const _cafeLat = 54.9893;
const _cafeLng = 73.3682;

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  YandexMapController? _mapController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Мы на карте')),
      body: YandexMap(
        mapObjects: [
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
              style: PlacemarkTextStyle(
                size: 14,
                color: Color(0xFFD6B06A),
              ),
            ),
          ),
        ],
        onMapCreated: (controller) async {
          _mapController = controller;
          await controller.moveCamera(
            CameraUpdate.newCameraPosition(
              CameraPosition(
                target: Point(latitude: _cafeLat, longitude: _cafeLng),
                zoom: 15,
              ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _goToMyLocation,
        backgroundColor: GrilyageTheme.gold,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.my_location),
        label: const Text('Моё местоположение'),
      ),
    );
  }

  Future<void> _goToMyLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Check if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Включите геолокацию в настройках телефона')),
      );
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Разрешите геолокацию в настройках')),
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Геолокация заблокирована навсегда — измените в настройках телефона')),
      );
      return;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      if (!mounted) return;

      await _mapController?.moveCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: Point(latitude: position.latitude, longitude: position.longitude),
            zoom: 15,
          ),
        ),
        animation: const MapAnimation(duration: 0.5, type: MapAnimationType.smooth),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Не удалось определить местоположение')),
      );
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}
