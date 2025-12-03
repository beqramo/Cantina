import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server';
import {
  processMenuUploadServer,
  createMenuServer,
  updateMenuServer,
  getMenuByDateServer,
} from '@/lib/menu-server';
import { MenuJSON } from '@/types';
import { formatMenuDate } from '@/lib/time';

/**
 * POST /api/admin/upload-menu
 * Uploads menu(s) from JSON data
 * Requires authentication (all authenticated users are admins)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication - all authenticated users are admins
    const userId = await verifyAuthToken();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json();
    const menuData: MenuJSON = body.menuData;

    if (!menuData) {
      return NextResponse.json(
        { error: 'Invalid request. menuData is required.' },
        { status: 400 },
      );
    }

    // Process menu upload
    const processedMenus = await processMenuUploadServer(menuData);

    if (processedMenus.length === 0) {
      return NextResponse.json(
        { error: 'No valid menus to process.' },
        { status: 400 },
      );
    }

    // Create or update menus in Firestore
    const results = [];
    for (const menu of processedMenus) {
      // Check if menu already exists for this date
      const existingMenu = await getMenuByDateServer(menu.date);

      if (existingMenu) {
        // Update existing menu
        await updateMenuServer(existingMenu.id, {
          lunch: menu.lunch,
          dinner: menu.dinner || null, // null if no dinner
        });
        results.push({
          date: formatMenuDate(menu.date),
          action: 'updated',
          id: existingMenu.id,
        });
      } else {
        // Create new menu
        const menuId = await createMenuServer(
          menu.date,
          menu.lunch,
          menu.dinner,
        );
        results.push({
          date: formatMenuDate(menu.date),
          action: 'created',
          id: menuId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} menu(s)`,
      results,
    });
  } catch (error) {
    console.error('[Menu Upload API] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upload menu. Please try again.',
      },
      { status: 500 },
    );
  }
}
