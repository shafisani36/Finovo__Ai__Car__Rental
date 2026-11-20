class VehicleStats {
  const VehicleStats({
    required this.total,
    required this.available,
    required this.rented,
    required this.maintenance,
  });

  final int total;
  final int available;
  final int rented;
  final int maintenance;

  factory VehicleStats.fromJson(Map<String, dynamic> json) {
    final metrics = json['metrics'];
    if (metrics is! Map<String, dynamic>) {
      throw const FormatException(
        'The server returned invalid vehicle statistics.',
      );
    }
    final values = metrics;
    return VehicleStats(
      total: _count(values['total']),
      available: _count(values['available']),
      rented: _count(values['rented']),
      maintenance: _count(values['maintenance']),
    );
  }
}

int _count(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}
