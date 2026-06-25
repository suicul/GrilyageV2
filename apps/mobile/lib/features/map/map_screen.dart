import 'package:flutter/material.dart';
import 'package:yandex_mapkit/yandex_mapkit.dart';
import '../../core/theme/theme.dart';

const _cafeLat = 54.9893;
const _cafeLng = 73.3682;

class MapScreen extends StatelessWidget {
  const MapScreen({super.key});

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
            icon:               PlacemarkIcon.single(
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
        onPressed: () {},
        backgroundColor: GrilyageTheme.gold,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.my_location),
        label: const Text('Моё местоположение'),
      ),
    );
  }
}
