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
        street: json['street'] as String,
        building: json['building'] as String,
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
}

class OrderItem {
  final String name;
  final int quantity;
  final double price;

  const OrderItem({
    required this.name,
    required this.quantity,
    required this.price,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        name: json['name'] as String,
        quantity: (json['quantity'] as num).toInt(),
        price: (json['price'] as num).toDouble(),
      );
}

class Order {
  final String id;
  final String status;
  final double total;
  final Address address;
  final List<OrderItem> items;
  final String customerName;
  final String customerPhone;
  final String? comment;
  final String? courierId;
  final DateTime? createdAt;
  final DateTime? acceptedAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;

  const Order({
    required this.id,
    required this.status,
    required this.total,
    required this.address,
    required this.items,
    required this.customerName,
    required this.customerPhone,
    this.comment,
    this.courierId,
    this.createdAt,
    this.acceptedAt,
    this.pickedUpAt,
    this.deliveredAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        status: json['status'] as String,
        total: (json['total'] as num).toDouble(),
        address: Address.fromJson(json['address'] as Map<String, dynamic>),
        items: (json['items'] as List<dynamic>)
            .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        customerName: json['customerName'] as String? ??
            (json['customer'] as Map<String, dynamic>?)?['name'] as String? ??
            '',
        customerPhone: json['customerPhone'] as String? ??
            (json['customer'] as Map<String, dynamic>?)?['phone'] as String? ??
            '',
        comment: json['comment'] as String?,
        courierId: json['courierId'] as String?,
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'] as String)
            : null,
        acceptedAt: json['acceptedAt'] != null
            ? DateTime.parse(json['acceptedAt'] as String)
            : null,
        pickedUpAt: json['pickedUpAt'] != null
            ? DateTime.parse(json['pickedUpAt'] as String)
            : null,
        deliveredAt: json['deliveredAt'] != null
            ? DateTime.parse(json['deliveredAt'] as String)
            : null,
      );

  static const statusNew = 'NEW';
  static const statusAccepted = 'CONFIRMED';
  static const statusPreparing = 'COOKING';
  static const statusReady = 'READY_FOR_PICKUP';
  static const statusPickedUp = 'DELIVERING';
  static const statusDelivered = 'COMPLETED';
  static const statusCancelled = 'CANCELLED';
}
