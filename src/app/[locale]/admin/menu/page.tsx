'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getMenusByDateRange, deleteMenu } from '@/lib/firestore';
import { Menu, MenuJSON, DishCategory } from '@/types';
import { logoutAdmin } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { DISH_CATEGORIES } from '@/lib/constants';
import { formatMenuDate } from '@/lib/time';
import { MenuDayJSON } from '@/types';
import { Calendar, Upload, Trash2, Save } from 'lucide-react';
import { Pagination } from '@/components/pagination/Pagination';

export default function AdminMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('Admin');
  const tMenu = useTranslations('Menu');
  const tNav = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [allMenus, setAllMenus] = useState<Menu[]>([]); // Store all menus for pagination
  const [loading, setLoading] = useState(true);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Form state for manual menu entry
  const [formData, setFormData] = useState<{
    date: string;
    lunch: { [key in DishCategory]: string } & { Sopa?: string };
    dinner: { [key in DishCategory]: string } & { Sopa?: string };
  }>({
    date: '',
    lunch: {
      'Sugestão do Chefe': '',
      'Dieta Mediterrânica': '',
      Alternativa: '',
      Vegetariana: '',
      Sopa: '',
    },
    dinner: {
      'Sugestão do Chefe': '',
      'Dieta Mediterrânica': '',
      Alternativa: '',
      Vegetariana: '',
      Sopa: '',
    },
  });

  useEffect(() => {
    loadMenus();
  }, []);

  // Handle URL parameter for JSON tab
  useEffect(() => {
    const uploadVariant = searchParams.get('upload-variant');
    if (uploadVariant === 'json') {
      setShowJsonEditor(true);
    }
  }, [searchParams]);

  // Pagination effect
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setMenus(allMenus.slice(startIndex, endIndex));
  }, [allMenus, currentPage]);

  const getAdminPath = (path: string) => {
    return locale === 'en' ? path : `/${locale}${path}`;
  };

  const loadMenus = async () => {
    setLoading(true);
    try {
      // Load menus for next 30 days
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);
      endDate.setHours(23, 59, 59, 999); // End of day
      const loadedMenus = await getMenusByDateRange(today, endDate);
      setAllMenus(loadedMenus);
      // Set initial page
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading menus:', error);
      setError('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    router.push(getAdminPath('/admin/login'));
  };

  const handleJsonUpload = async () => {
    setError(null);
    setSuccess(null);

    try {
      const menuData: MenuJSON = JSON.parse(jsonInput);

      // Call API endpoint instead of client-side Firestore
      const response = await fetch('/api/admin/upload-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menuData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload menu');
      }

      // Show success message
      const successMessage =
        result.message ||
        `Successfully uploaded ${result.results?.length || 0} menu(s)`;
      setSuccess(successMessage);
      setJsonInput('');

      // Reload menus to show updated data
      await loadMenus();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid JSON format. Please check your input.',
      );
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.date) {
      setError('Please select a date');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Process form data - use MenuDayJSON format
      const menuDay: MenuDayJSON = {
        date: formData.date,
        lunch: {
          'Sugestão do Chefe': formData.lunch['Sugestão do Chefe'],
          'Dieta Mediterrânica': formData.lunch['Dieta Mediterrânica'],
          Alternativa: formData.lunch.Alternativa,
          Vegetariana: formData.lunch.Vegetariana,
          ...(formData.lunch.Sopa?.trim() && {
            Sopa: formData.lunch.Sopa.trim(),
          }),
        },
      };

      // Only include dinner if at least one field is filled
      const hasDinnerData =
        DISH_CATEGORIES.some((category) => formData.dinner[category]?.trim()) ||
        formData.dinner.Sopa?.trim();
      if (hasDinnerData) {
        menuDay.dinner = {
          'Sugestão do Chefe': formData.dinner['Sugestão do Chefe'],
          'Dieta Mediterrânica': formData.dinner['Dieta Mediterrânica'],
          Alternativa: formData.dinner.Alternativa,
          Vegetariana: formData.dinner.Vegetariana,
          ...(formData.dinner.Sopa?.trim() && {
            Sopa: formData.dinner.Sopa.trim(),
          }),
        };
      }

      // Call API endpoint instead of client-side Firestore
      const response = await fetch('/api/admin/upload-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menuData: menuDay }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save menu');
      }

      // Show success message
      if (editingMenu) {
        setSuccess('Menu updated successfully');
      } else {
        setSuccess('Menu created successfully');
      }

      // Reload menus to show updated data
      await loadMenus();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);

      // Reset form
      setFormData({
        date: '',
        lunch: {
          'Sugestão do Chefe': '',
          'Dieta Mediterrânica': '',
          Alternativa: '',
          Vegetariana: '',
          Sopa: '',
        },
        dinner: {
          'Sugestão do Chefe': '',
          'Dieta Mediterrânica': '',
          Alternativa: '',
          Vegetariana: '',
          Sopa: '',
        },
      });
      setEditingMenu(null);
      loadMenus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save menu. Please try again.',
      );
    }
  };

  const handleEditMenu = (menu: Menu) => {
    setEditingMenu(menu);
    const date = formatMenuDate(menu.date, locale);

    setFormData({
      date,
      lunch: {
        'Sugestão do Chefe': menu.lunch['Sugestão do Chefe'].dishName,
        'Dieta Mediterrânica': menu.lunch['Dieta Mediterrânica'].dishName,
        Alternativa: menu.lunch['Alternativa'].dishName,
        Vegetariana: menu.lunch['Vegetariana'].dishName,
        Sopa: menu.lunch.Sopa?.dishName || '',
      },
      dinner: menu.dinner
        ? {
            'Sugestão do Chefe': menu.dinner['Sugestão do Chefe'].dishName,
            'Dieta Mediterrânica': menu.dinner['Dieta Mediterrânica'].dishName,
            Alternativa: menu.dinner['Alternativa'].dishName,
            Vegetariana: menu.dinner['Vegetariana'].dishName,
            Sopa: menu.dinner.Sopa?.dishName || '',
          }
        : {
            'Sugestão do Chefe': '',
            'Dieta Mediterrânica': '',
            Alternativa: '',
            Vegetariana: '',
            Sopa: '',
          },
    });
    setShowJsonEditor(false);
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (confirm('Are you sure you want to delete this menu?')) {
      try {
        await deleteMenu(menuId);
        loadMenus();
        setSuccess('Menu deleted successfully');
        setTimeout(() => setSuccess(null), 5000);
      } catch {
        setError('Failed to delete menu');
      }
    }
  };

  const getJsonTemplate = (): string => {
    // Return array format template (can upload single day or multiple days)
    // Note: soup field can be "soup" or "Sopa" - both are supported
    return JSON.stringify(
      [
        {
          date: '15/01/2024',
          lunch: {
            'Sugestão do Chefe': '',
            'Dieta Mediterrânica': '',
            Alternativa: '',
            Vegetariana: '',
            Sopa: '', // Optional soup name (can also use "soup")
          },
          dinner: {
            'Sugestão do Chefe': '',
            'Dieta Mediterrânica': '',
            Alternativa: '',
            Vegetariana: '',
            Sopa: '', // Optional soup name (can also use "soup")
          },
        },
        {
          date: '20/01/2024',
          lunch: {
            'Sugestão do Chefe': '',
            'Dieta Mediterrânica': '',
            Alternativa: '',
            Vegetariana: '',
            Sopa: '', // Optional soup name (can also use "soup")
          },
          // Dinner is optional on any day
        },
      ],
      null,
      2,
    );
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold'>
          {tMenu('menuManagement') || 'Menu Management'}
        </h1>
        <Button variant='outline' onClick={handleLogout}>
          {tNav('logout')}
        </Button>
      </div>

      {error && (
        <Alert variant='destructive' className='mb-4'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className='mb-4 bg-green-50 border-green-200'>
          <AlertDescription className='text-green-800'>
            {success}
          </AlertDescription>
        </Alert>
      )}

      <div className='space-y-6'>
        {/* Toggle between JSON and Form */}
        <div className='flex gap-2'>
          <Button
            variant={showJsonEditor ? 'default' : 'outline'}
            onClick={() => {
              setShowJsonEditor(true);
              // Update URL to include upload-variant=json
              const adminMenuPath = getAdminPath('/admin/menu');
              router.replace(`${adminMenuPath}?upload-variant=json`, {
                scroll: false,
              });
            }}>
            <Upload className='h-4 w-4 mr-2' />
            {tMenu('uploadJson') || 'Upload JSON'}
          </Button>
          <Button
            variant={!showJsonEditor ? 'default' : 'outline'}
            onClick={() => {
              setShowJsonEditor(false);
              setEditingMenu(null);
              setFormData({
                date: '',
                lunch: {
                  'Sugestão do Chefe': '',
                  'Dieta Mediterrânica': '',
                  Alternativa: '',
                  Vegetariana: '',
                  Sopa: '',
                },
                dinner: {
                  'Sugestão do Chefe': '',
                  'Dieta Mediterrânica': '',
                  Alternativa: '',
                  Vegetariana: '',
                  Sopa: '',
                },
              });
              // Update URL to remove upload-variant parameter
              const adminMenuPath = getAdminPath('/admin/menu');
              router.replace(adminMenuPath, { scroll: false });
            }}>
            <Calendar className='h-4 w-4 mr-2' />
            {tMenu('manualEntry') || 'Manual Entry'}
          </Button>
        </div>

        {/* JSON Editor */}
        {showJsonEditor && (
          <Card>
            <CardHeader>
              <CardTitle>
                {tMenu('uploadJsonMenu') || 'Upload JSON Menu'}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium mb-2 block'>
                  {tMenu('jsonFormat') || 'JSON Format (DD/MM/YYYY)'}
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className='w-full h-64 p-3 border rounded-md font-mono text-sm'
                  placeholder={getJsonTemplate()}
                />
                <Button
                  variant='outline'
                  size='sm'
                  className='mt-2'
                  onClick={() => setJsonInput(getJsonTemplate())}>
                  {tMenu('loadTemplate') || 'Load Template'}
                </Button>
              </div>
              <Button onClick={handleJsonUpload} className='w-full'>
                <Upload className='h-4 w-4 mr-2' />
                {tMenu('uploadMenus') || 'Upload Menus'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual Form Entry */}
        {!showJsonEditor && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingMenu
                  ? tMenu('editMenu') || 'Edit Menu'
                  : tMenu('createMenu') || 'Create Menu'}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium mb-2 block'>
                  {tMenu('date') || 'Date'} (DD/MM/YYYY)
                </label>
                <Input
                  type='text'
                  value={formData.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormData({ ...formData, date: newDate });
                  }}
                  placeholder='DD/MM/YYYY'
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Lunch */}
                <div>
                  <h3 className='font-semibold mb-3'>
                    {tMenu('lunch') || 'Lunch'}
                  </h3>
                  {DISH_CATEGORIES.map((category) => (
                    <div key={category} className='mb-3'>
                      <label className='text-sm font-medium mb-1 block'>
                        {category}
                      </label>
                      <Input
                        type='text'
                        value={formData.lunch[category]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lunch: {
                              ...formData.lunch,
                              [category]: e.target.value,
                            },
                          })
                        }
                        placeholder={tMenu('dishName') || 'Dish name'}
                      />
                    </div>
                  ))}
                  {/* Soup field */}
                  <div className='mb-3 mt-4 pt-4 border-t'>
                    <label className='text-sm font-medium mb-1 block'>
                      {tMenu('soupHeader') || tMenu('soup') || 'Soup'} (
                      {tMenu('optional') || 'Optional'})
                    </label>
                    <Input
                      type='text'
                      value={formData.lunch.Sopa || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lunch: {
                            ...formData.lunch,
                            Sopa: e.target.value,
                          },
                        })
                      }
                      placeholder={
                        tMenu('soupNamePlaceholder') ||
                        tMenu('soupName') ||
                        'Soup name'
                      }
                    />
                  </div>
                </div>

                {/* Dinner */}
                <div>
                  <h3 className='font-semibold mb-3'>
                    {tMenu('dinner') || 'Dinner'}
                  </h3>
                  {DISH_CATEGORIES.map((category) => (
                    <div key={category} className='mb-3'>
                      <label className='text-sm font-medium mb-1 block'>
                        {category}
                      </label>
                      <Input
                        type='text'
                        value={formData.dinner[category]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dinner: {
                              ...formData.dinner,
                              [category]: e.target.value,
                            },
                          })
                        }
                        placeholder={tMenu('dishName') || 'Dish name'}
                      />
                    </div>
                  ))}
                  {/* Soup field */}
                  <div className='mb-3 mt-4 pt-4 border-t'>
                    <label className='text-sm font-medium mb-1 block'>
                      {tMenu('soupHeader') || tMenu('soup') || 'Soup'} (
                      {tMenu('optional') || 'Optional'})
                    </label>
                    <Input
                      type='text'
                      value={formData.dinner.Sopa || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dinner: {
                            ...formData.dinner,
                            Sopa: e.target.value,
                          },
                        })
                      }
                      placeholder={
                        tMenu('soupNamePlaceholder') ||
                        tMenu('soupName') ||
                        'Soup name'
                      }
                    />
                  </div>
                </div>
              </div>

              <div className='flex gap-2'>
                {editingMenu && (
                  <Button
                    variant='outline'
                    onClick={() => {
                      setEditingMenu(null);
                      setFormData({
                        date: '',
                        lunch: {
                          'Sugestão do Chefe': '',
                          'Dieta Mediterrânica': '',
                          Alternativa: '',
                          Vegetariana: '',
                          Sopa: '',
                        },
                        dinner: {
                          'Sugestão do Chefe': '',
                          'Dieta Mediterrânica': '',
                          Alternativa: '',
                          Vegetariana: '',
                          Sopa: '',
                        },
                      });
                    }}>
                    {t('cancel')}
                  </Button>
                )}
                <Button onClick={handleFormSubmit} className='flex-1'>
                  <Save className='h-4 w-4 mr-2' />
                  {editingMenu
                    ? tMenu('updateMenu') || 'Update Menu'
                    : tMenu('createMenu') || 'Create Menu'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Menus */}
        <div>
          <h2 className='text-2xl font-bold mb-4'>
            {tMenu('existingMenus') || 'Existing Menus'}
          </h2>
          {loading ? (
            <div className='text-center py-8 text-muted-foreground'>
              {tCommon('loading') || 'Loading...'}
            </div>
          ) : menus.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              {tMenu('noMenus') || 'No menus found'}
            </div>
          ) : (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {menus.map((menu) => (
                  <Card key={menu.id}>
                    <CardHeader>
                      <CardTitle>{formatMenuDate(menu.date, locale)}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                      <div>
                        <strong>{tMenu('lunch') || 'Lunch'}:</strong>
                        <ul className='list-disc list-inside text-sm mt-1'>
                          {DISH_CATEGORIES.map((cat) => (
                            <li key={cat}>
                              {menu.lunch[cat]?.dishName || '-'}
                            </li>
                          ))}
                          {menu.lunch.Sopa?.dishName && (
                            <li className='font-medium text-orange-600 dark:text-orange-400'>
                              {tMenu('soup') || 'Soup'}:{' '}
                              {menu.lunch.Sopa.dishName}
                            </li>
                          )}
                        </ul>
                      </div>
                      {menu.dinner ? (
                        <div>
                          <strong>{tMenu('dinner') || 'Dinner'}:</strong>
                          <ul className='list-disc list-inside text-sm mt-1'>
                            {DISH_CATEGORIES.map((cat) => (
                              <li key={cat}>
                                {menu.dinner![cat]?.dishName || '-'}
                              </li>
                            ))}
                            {menu.dinner.Sopa?.dishName && (
                              <li className='font-medium text-orange-600 dark:text-orange-400'>
                                {tMenu('soup') || 'Soup'}:{' '}
                                {menu.dinner.Sopa.dishName}
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : (
                        <div>
                          <strong>{tMenu('dinner') || 'Dinner'}:</strong>
                          <p className='text-sm text-muted-foreground mt-1'>
                            {tMenu('noDinner') || 'No dinner menu'}
                          </p>
                        </div>
                      )}
                      <div className='flex gap-2 mt-4'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleEditMenu(menu)}
                          className='flex-1'>
                          {t('edit') || 'Edit'}
                        </Button>
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() => handleDeleteMenu(menu.id)}>
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {allMenus.length > pageSize && (
                <div className='mt-6'>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(allMenus.length / pageSize)}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
