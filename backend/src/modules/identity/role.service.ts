import { prisma } from '../../infrastructure/prisma/prisma.client';

export class RoleService {
  /**
   * Assigns the default 'CUSTOMER' role to a newly registered user
   */
  static async assignDefaultRole(userId: string): Promise<void> {
    let customerRole = await prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      customerRole = await prisma.role.create({
        data: {
          name: 'CUSTOMER',
          description: 'Standard verified rental customer',
          isSystem: true,
        },
      });
    }

    await prisma.userRole.create({
      data: {
        userId,
        roleId: customerRole.id,
      },
    });
  }

  /**
   * Retrieves all roles and compiled permissions for a user
   */
  static async getUserRolesAndPermissions(userId: string): Promise<{
    roles: string[];
    permissions: string[];
  }> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roles = userRoles.map((ur) => ur.role.name);
    const permissionSet = new Set<string>();

    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    return {
      roles,
      permissions: Array.from(permissionSet),
    };
  }
}
