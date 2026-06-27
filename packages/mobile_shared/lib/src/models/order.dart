import '../constants/constants.dart' as constants;

/// Delivery address for courier app
class Address {
  final String street;
  final String building;
  final String? apartment;
  final String? entrance;
  final String? floor;
  final String? intercom;

  const Address({
    required this.street,
    required this.building,
    this.apartment,
    this.entrance,
    this.floor,
    this.intercom,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        street: json['street'] as String? ?? '',
        building: json['building'] as String? ?? '',
        apartment: json['apartment'] as String?,
        entrance: json['entrance'] as String?,
        floor: json['floor'] as String?,
        intercom: json['intercom'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'street': street,
        'building': building,
        'apartment': apartment,
        'entrance': entrance,
        'floor': floor,
        'intercom': intercom,
      };

  String get fullAddress =>
      '${street}, ${building}${apartment != null ? ', кв. ${apartment}' : ''}';
}

/// Single item in an order
class OrderItem {
  final String name;
  final int quantity;
  final int price; // in kopecks

  const OrderItem({
    required this.name,
    required this.quantity,
    required this.price,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        name: json['name'] as String? ?? json['nameSnapshot'] as String? ?? '',
        quantity: constants.safeInt(json['quantity'] ?? json['qty']),
        price: constants.safeInt(json['price'] ?? json['priceSnapshot']),
      );

  String get priceFormatted => constants.formatPrice(price);
}

/// Shared Order model used by both mobile and courier apps
class Order {
  final String id;
  final String status;
  final int total; // in kopecks
  final String customerName;
  final String customerPhone;
  final String? address;
  final String? comment;
  final String? courierId;
  final String createdAt;
  final String? updatedAt;
  final List<OrderItem> items;

  Order({
    required this.id,
    required this.status,
    required this.total,
    this.customerName = '',
    this.customerPhone = '',
    this.address,
    this.comment,
    this.courierId,
    required this.createdAt,
    this.updatedAt,
    required this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String? ?? '',
        status: json['status'] as String? ?? '',
        total: constants.safeInt(json['total']),
        customerName: json['customerName'] as String? ?? '',
        customerPhone: json['customerPhone'] as String? ?? '',
        address: json['address'] as String?,
        comment: json['comment'] as String?,
        courierId: json['courierId'] as String?,
        createdAt: json['createdAt'] as String? ?? '',
        updatedAt: json['updatedAt'] as String?,
        items: (json['items'] as List<dynamic>?)
                ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );

  String get totalFormatted => constants.formatPrice(total);

  String get statusLabel =>
      constants.orderStatusLabels[status] ?? status;

  String get statusColor =>
      constants.orderStatusColors[status] ?? '#D6B06A';

  bool get isActive => constants.activeStatuses.contains(status);
}

/// Simple address model for mobile app (user's saved addresses)
class UserAddress {
  final String id;
  final String label;
  final String street;
  final String? apartment;
  final double lat;
  final double lng;
  final bool isDefault;

  UserAddress({
    required this.id,
    required this.label,
    required this.street,
    this.apartment,
    required this.lat,
    required this.lng,
    required this.isDefault,
  });

  factory UserAddress.fromJson(Map<String, dynamic> json) => UserAddress(
        id: json['id'] as String? ?? '',
        label: json['label'] as String? ?? '',
        street: json['street'] as String? ?? '',
        apartment: json['apartment'] as String?,
        lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
        lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
        isDefault: json['isDefault'] as bool? ?? false,
      );
}
