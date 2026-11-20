import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';
import '../../models/vehicle_list_item.dart';
import '../home_fleet_controller.dart';

class CarsListSection extends StatefulWidget {
  const CarsListSection({
    super.key,
    required this.controller,
    required this.onSignIn,
  });

  final HomeFleetController controller;
  final VoidCallback onSignIn;

  @override
  State<CarsListSection> createState() => _CarsListSectionState();
}

class _CarsListSectionState extends State<CarsListSection> {
  static const double _carColumnWidth = 164;
  static const _statuses = <(String, String)>[
    ('ALL', 'All statuses'),
    ('AVAILABLE', 'Available'),
    ('RENTED', 'Rented'),
    ('MAINTENANCE', 'Maintenance'),
    ('RESERVED', 'Reserved'),
  ];

  final _searchController = TextEditingController();
  Timer? _searchTimer;

  @override
  void dispose() {
    _searchTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _searchChanged(String value) {
    _searchTimer?.cancel();
    _searchTimer = Timer(
      const Duration(milliseconds: 400),
      () => widget.controller.setSearch(value),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        final controller = widget.controller;
        if (_searchController.text != controller.search) {
          _searchController.value = TextEditingValue(
            text: controller.search,
            selection: TextSelection.collapsed(
              offset: controller.search.length,
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: const [
              BoxShadow(
                color: Color(0x10000000),
                blurRadius: 10,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildFilters(controller),
              const SizedBox(height: 10),
              if (controller.loading && controller.vehicles.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 36),
                  child: Column(
                    children: [
                      CircularProgressIndicator(strokeWidth: 2),
                      SizedBox(height: 10),
                      Text('Loading cars...'),
                    ],
                  ),
                )
              else if (controller.error != null)
                _buildError(controller)
              else if (controller.vehicles.isEmpty)
                _buildEmptyState(controller)
              else ...[
                if (controller.loading)
                  const LinearProgressIndicator(minHeight: 2),
                _buildTable(controller),
                const SizedBox(height: 8),
                _buildFooter(controller),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilters(HomeFleetController controller) {
    final categories = controller.categories;
    return Column(
      children: [
        TextField(
          controller: _searchController,
          onChanged: _searchChanged,
          style: AppTextStyles.subtitle3,
          decoration: InputDecoration(
            hintText: 'Search by brand, model, or registration number...',
            hintStyle: AppTextStyles.subtitle3.copyWith(
              color: AppColors.textSecondary,
              fontSize: 10,
            ),
            prefixIcon: const Icon(Icons.search, size: 17),
            prefixIconConstraints: const BoxConstraints(
              minWidth: 34,
              minHeight: 36,
            ),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 9,
              vertical: 10,
            ),
            filled: true,
            fillColor: const Color(0xfffaf9fb),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(9),
              borderSide: const BorderSide(color: Color(0xffebe5ed)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(9),
              borderSide: const BorderSide(color: Color(0xffebe5ed)),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: controller.categoryId ?? '',
                isExpanded: true,
                style: AppTextStyles.subtitle3.copyWith(fontSize: 10),
                decoration: _filterDecoration(),
                items: [
                  const DropdownMenuItem<String>(
                    value: '',
                    child: Text(
                      'All categories',
                      overflow: TextOverflow.ellipsis,
                      style: _filterTextStyle,
                    ),
                  ),
                  for (final category in categories)
                    DropdownMenuItem<String>(
                      value: category.id,
                      child: Text(
                        category.name,
                        overflow: TextOverflow.ellipsis,
                        style: _filterTextStyle,
                      ),
                    ),
                ],
                onChanged: (value) =>
                    controller.setCategory(value == '' ? null : value),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: controller.status ?? 'ALL',
                isExpanded: true,
                style: AppTextStyles.subtitle3.copyWith(fontSize: 10),
                decoration: _filterDecoration(),
                items: [
                  for (final status in _statuses)
                    DropdownMenuItem<String>(
                      value: status.$1,
                      child: Text(
                        status.$2,
                        overflow: TextOverflow.ellipsis,
                        style: _filterTextStyle,
                      ),
                    ),
                ],
                onChanged: (value) =>
                    controller.setStatus(value == 'ALL' ? null : value),
              ),
            ),
            const SizedBox(width: 4),
            TextButton.icon(
              onPressed: controller.hasActiveFilters
                  ? () {
                      _searchTimer?.cancel();
                      controller.resetFilters();
                    }
                  : null,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                minimumSize: Size.zero,
              ),
              icon: const Icon(Icons.refresh, size: 14),
              label: const Text('Reset', style: TextStyle(fontSize: 10)),
            ),
          ],
        ),
      ],
    );
  }

  InputDecoration _filterDecoration() => InputDecoration(
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 7, vertical: 9),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(9),
      borderSide: const BorderSide(color: Color(0xffebe5ed)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(9),
      borderSide: const BorderSide(color: Color(0xffebe5ed)),
    ),
  );

  Widget _buildTable(HomeFleetController controller) {
    return Column(
      children: [
        _tableRow(
          car: const Text('Car', style: _tableHeaderStyle),
          body: const [
            _TableCell(label: 'Category', width: 100),
            _TableCell(label: 'Year', width: 62),
            _TableCell(label: 'Reg.', width: 100),
            _TableCell(label: 'Pricing', width: 90),
            _TableCell(label: 'Status', width: 108),
            _TableCell(label: 'Actions', width: 112),
          ],
          isHeader: true,
        ),
        for (var index = 0; index < controller.vehicles.length; index++)
          _vehicleRow(controller.vehicles[index], index),
      ],
    );
  }

  Widget _vehicleRow(VehicleListItem vehicle, int index) {
    final color = index.isEven ? const Color(0xfff8f2f9) : AppColors.white;
    return _tableRow(
      car: _carCell(vehicle),
      body: [
        _TableCell(
          width: 100,
          child: Text(
            vehicle.categoryName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        _TableCell(width: 62, child: Text('${vehicle.year}')),
        _TableCell(
          width: 100,
          child: Text(
            vehicle.registrationNumber,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontFamily: 'monospace'),
          ),
        ),
        _TableCell(
          width: 90,
          child: Text(
            '\$${_formatRate(vehicle.dailyRate)} / day',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        _TableCell(width: 108, child: _statusChip(vehicle.status)),
        _TableCell(width: 112, child: _actions()),
      ],
      backgroundColor: color,
    );
  }

  Widget _tableRow({
    required Widget car,
    required List<_TableCell> body,
    bool isHeader = false,
    Color? backgroundColor,
  }) {
    return Container(
      height: isHeader ? 38 : 57,
      decoration: BoxDecoration(
        color: backgroundColor ?? (isHeader ? const Color(0xfffaf9fb) : null),
        border: const Border(bottom: BorderSide(color: Color(0xfff0edf2))),
      ),
      child: Row(
        children: [
          SizedBox(
            width: _carColumnWidth,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: car,
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final cell in body)
                    SizedBox(
                      width: cell.width,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child:
                            cell.child ??
                            Text(cell.label, style: _tableHeaderStyle),
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

  Widget _carCell(VehicleListItem vehicle) {
    final imageUrl = vehicle.imageUrl;
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(7),
          child: Container(
            width: 45,
            height: 34,
            color: AppColors.primary10,
            child: imageUrl == null
                ? const Icon(
                    Icons.directions_car_outlined,
                    size: 22,
                    color: AppColors.textSecondary,
                  )
                : Image.network(
                    imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const Icon(
                      Icons.directions_car_outlined,
                      size: 22,
                      color: AppColors.textSecondary,
                    ),
                  ),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                vehicle.model,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.subtitle3.copyWith(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary70,
                ),
              ),
              Text(
                vehicle.brand,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.subtitle3.copyWith(
                  fontSize: 9,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _statusChip(String status) {
    final appearance = switch (status) {
      'AVAILABLE' => (
        'Available',
        const Color(0xff16845b),
        const Color(0xffe6f7ef),
      ),
      'RENTED' => ('Rented', const Color(0xff2563eb), const Color(0xffe7eeff)),
      'MAINTENANCE' => (
        'Maintenance',
        const Color(0xffd97706),
        const Color(0xfffff3df),
      ),
      'RESERVED' => (
        'Reserved',
        const Color(0xff2563eb),
        const Color(0xffe7eeff),
      ),
      _ => (status, AppColors.textSecondary, const Color(0xfff2f1f5)),
    };
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: appearance.$3,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          appearance.$1,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTextStyles.subtitle3.copyWith(
            fontSize: 9,
            color: appearance.$2,
          ),
        ),
      ),
    );
  }

  Widget _actions() => const Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      SizedBox(
        width: 23,
        child: Icon(
          Icons.visibility_outlined,
          size: 14,
          color: Color(0xff6b6280),
        ),
      ),
      SizedBox(
        width: 23,
        child: Icon(Icons.edit_outlined, size: 14, color: Color(0xff6b6280)),
      ),
      SizedBox(
        width: 23,
        child: Icon(Icons.delete_outline, size: 14, color: Color(0xffdc5555)),
      ),
    ],
  );

  Widget _buildFooter(HomeFleetController controller) {
    final start = controller.total == 0
        ? 0
        : (controller.page - 1) * HomeFleetController.pageSize + 1;
    final end = (controller.page * HomeFleetController.pageSize).clamp(
      0,
      controller.total,
    );
    final pages = paginationWindow(controller.page, controller.totalPages);
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 4,
      children: [
        Text(
          'Showing $start-$end of ${controller.total} cars',
          style: AppTextStyles.subtitle3.copyWith(
            fontSize: 9,
            color: AppColors.textSecondary,
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PageButton(
              icon: Icons.chevron_left,
              enabled: controller.page > 1 && !controller.loading,
              onPressed: () => controller.setPage(controller.page - 1),
            ),
            for (final value in pages)
              _PageButton(
                label: '$value',
                selected: value == controller.page,
                enabled: !controller.loading,
                onPressed: () => controller.setPage(value),
              ),
            _PageButton(
              icon: Icons.chevron_right,
              enabled:
                  controller.page < controller.totalPages &&
                  !controller.loading,
              onPressed: () => controller.setPage(controller.page + 1),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEmptyState(HomeFleetController controller) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28),
      child: Column(
        children: [
          const Icon(
            Icons.directions_car_outlined,
            size: 34,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 8),
          Text('No cars found', style: AppTextStyles.heading6),
          if (controller.hasActiveFilters)
            TextButton(
              onPressed: controller.resetFilters,
              child: const Text('Reset filters'),
            ),
        ],
      ),
    );
  }

  Widget _buildError(HomeFleetController controller) {
    final signInRequired = controller.requiresSignIn;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 22),
      child: Column(
        children: [
          const Icon(Icons.cloud_off_outlined, color: Color(0xffb54a4a)),
          const SizedBox(height: 8),
          Text(
            signInRequired
                ? 'Your staff session expired. Sign in again.'
                : 'Could not load cars. Please try again.',
            textAlign: TextAlign.center,
            style: AppTextStyles.subtitle3,
          ),
          TextButton(
            onPressed: signInRequired ? widget.onSignIn : controller.load,
            child: Text(signInRequired ? 'Sign in' : 'Retry'),
          ),
        ],
      ),
    );
  }

  String _formatRate(double rate) => rate == rate.roundToDouble()
      ? rate.toStringAsFixed(0)
      : rate.toStringAsFixed(2);
}

class _TableCell {
  const _TableCell({this.label = '', required this.width, this.child});

  final String label;
  final double width;
  final Widget? child;
}

const _tableHeaderStyle = TextStyle(
  fontFamily: AppTextStyles.fontFamily,
  fontSize: 10,
  fontWeight: FontWeight.w600,
  color: AppColors.textPrimary,
);

const _filterTextStyle = TextStyle(
  fontFamily: AppTextStyles.fontFamily,
  fontSize: 10,
  color: AppColors.textPrimary,
);

class _PageButton extends StatelessWidget {
  const _PageButton({
    this.icon,
    this.label,
    this.selected = false,
    required this.enabled,
    required this.onPressed,
  });

  final IconData? icon;
  final String? label;
  final bool selected;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 2),
    child: SizedBox(
      width: 28,
      height: 28,
      child: TextButton(
        onPressed: enabled ? onPressed : null,
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          foregroundColor: selected ? AppColors.white : AppColors.primary,
          backgroundColor: selected ? AppColors.primary : AppColors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(7),
            side: BorderSide(
              color: selected ? AppColors.primary : const Color(0xffe9e5ed),
            ),
          ),
        ),
        child: icon == null
            ? Text(
                label ?? '',
                style: AppTextStyles.subtitle3.copyWith(fontSize: 10),
              )
            : Icon(icon, size: 15),
      ),
    ),
  );
}
