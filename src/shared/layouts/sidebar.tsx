import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '@/store';
import { cn } from '@core/utils';
import { useRoleBasedMenu } from '@/hooks/use-role-based-menu';
import type { MenuItem } from '@/config/menu';
import { getSidebarMenuIcon } from './menu-icon-map';
import './sidebar.css';

interface MenuItemProps {
  item: MenuItem;
  isCollapsed: boolean;
  level?: number;
}

function MenuItemComponent({ item, isCollapsed, level = 0 }: MenuItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const safeLabel = typeof item.label === 'string' ? item.label : 'Menu Item';

  // External URL (opens in new tab)
  if (item.externalUrl) {
    return (
      <a
        href={item.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={!isCollapsed ? safeLabel : undefined}
        className="sidebar__menu-item"
        style={{
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          paddingLeft: isCollapsed ? '12px' : `${12 + level * 16}px`,
        }}
      >
        <span className="sidebar__menu-item-icon">{getSidebarMenuIcon(safeLabel, item.icon, 20)}</span>
        {!isCollapsed && <span>{safeLabel}</span>}
      </a>
    );
  }

  // Parent item with children (nested menu)
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={!isCollapsed ? safeLabel : undefined}
          className={cn(
            'sidebar__menu-item sidebar__menu-item--parent',
            isExpanded && 'sidebar__menu-item--active'
          )}
          style={{
            minHeight: '40px',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            paddingLeft: isCollapsed ? '12px' : `${12 + level * 16}px`,
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '18px',
                minWidth: '24px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {getSidebarMenuIcon(safeLabel, item.icon, 20)}
            </span>
            {!isCollapsed && <span>{safeLabel}</span>}
          </div>
          {!isCollapsed && (
            <span
              style={{
                fontSize: '12px',
                transition: 'transform 0.2s ease',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              ▸
            </span>
          )}
        </button>

        {/* Child items - only show when expanded and sidebar not collapsed */}
        {isExpanded && !isCollapsed && (
          <div style={{ marginTop: '2px' }}>
            {item.children?.map((child, index) => (
              <MenuItemComponent
                key={`${typeof child.label === 'string' ? child.label : 'item'}-${index}`}
                item={child}
                isCollapsed={isCollapsed}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular link item
  if (item.path) {
    return (
      <NavLink
        to={item.path}
        title={!isCollapsed ? safeLabel : undefined}
        className={({ isActive }) =>
          cn(
            'sidebar__menu-item no-underline',
            isActive && 'sidebar__menu-item--active'
          )
        }
        style={{
          minHeight: '40px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          paddingLeft: isCollapsed ? '12px' : `${12 + level * 16}px`,
        }}
      >
        <span
          style={{
            fontSize: '18px',
            minWidth: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {getSidebarMenuIcon(safeLabel, item.icon, 20)}
        </span>
        {!isCollapsed && <span>{safeLabel}</span>}
      </NavLink>
    );
  }

  return null;
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore((state) => ({
    sidebarOpen: state.sidebarOpen,
    toggleSidebar: state.toggleSidebar,
  }));

  const menuItems = useRoleBasedMenu();

  return (
    <aside
      className={cn(
        'sidebar',
        sidebarOpen ? 'sidebar--expanded' : 'sidebar--collapsed'
      )}
    >
      {/* Top bar with Menu title and collapse button */}
      <div className="sidebar__header">
        {sidebarOpen && <div className="sidebar__title">Menu</div>}
        <button
          onClick={toggleSidebar}
          className="sidebar__toggle-button"
          style={{
            marginLeft: sidebarOpen ? '0' : 'auto',
            marginRight: sidebarOpen ? '0' : 'auto',
          }}
          title={sidebarOpen ? 'Collapse' : 'Expand'}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '«' : '»'}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="sidebar__nav">
        {menuItems.map((item, index) => (
          <MenuItemComponent
            key={`${typeof item.label === 'string' ? item.label : 'item'}-${index}`}
            item={item}
            isCollapsed={!sidebarOpen}
          />
        ))}
      </nav>
    </aside>
  );
}
