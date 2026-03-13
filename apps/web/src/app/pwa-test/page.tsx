'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Database,
  HardDrive,
  Share2,
} from 'lucide-react';
import { swManager } from '@/lib/pwa/service-worker-manager';
import { cacheManager } from '@/lib/pwa/cache-manager';
import { pushManager } from '@/lib/pwa/push-manager';
import { offlineStorage } from '@/lib/pwa/offline-storage';
import {
  isInstalled,
  isOnline,
  isPushSupported,
  isServiceWorkerSupported,
  getStorageUsagePercentage,
  formatBytes,
  share,
} from '@/lib/pwa/pwa-utils';

export default function PWATestPage() {
  const [swVersion, setSwVersion] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    loadStatus();

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStatus = async () => {
    setOnline(isOnline());
    setInstalled(isInstalled());

    const version = await swManager.getVersion();
    setSwVersion(version);

    const subscribed = await pushManager.isSubscribed();
    setIsSubscribed(subscribed);

    const usage = await getStorageUsagePercentage();
    setStorageUsage(usage);

    const size = await cacheManager.getSize();
    setCacheSize(size);
  };

  const handleCheckUpdate = async () => {
    await swManager.checkForUpdates();
    alert('已检查更新');
  };

  const handleClearCache = async () => {
    await swManager.clearCaches();
    alert('缓存已清除');
    await loadStatus();
  };

  const handleSubscribe = async () => {
    const subscription = await pushManager.subscribe();
    if (subscription) {
      alert('订阅成功');
      setIsSubscribed(true);
    } else {
      alert('订阅失败');
    }
  };

  const handleUnsubscribe = async () => {
    const result = await pushManager.unsubscribe();
    if (result) {
      alert('取消订阅成功');
      setIsSubscribed(false);
    }
  };

  const handleTestNotification = async () => {
    await pushManager.showNotification({
      title: '测试通知',
      body: '这是一条测试通知',
      tag: 'test',
    });
  };

  const handleTestOfflineStorage = async () => {
    await offlineStorage.setCachedData('test-key', { message: 'Hello PWA!' }, 3600000);
    const data = await offlineStorage.getCachedData('test-key');
    alert(`存储测试: ${JSON.stringify(data)}`);
  };

  const handleShare = async () => {
    const success = await share({
      title: 'EduNexus PWA',
      text: '查看这个很棒的 PWA 应用！',
      url: window.location.href,
    });

    if (success) {
      alert('分享成功');
    } else {
      alert('分享失败或取消');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          PWA 功能测试
        </h1>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatusCard
            icon={online ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            title="网络状态"
            value={online ? '在线' : '离线'}
            color={online ? 'green' : 'orange'}
          />

          <StatusCard
            icon={<Download className="w-6 h-6" />}
            title="安装状态"
            value={installed ? '已安装' : '未安装'}
            color={installed ? 'green' : 'gray'}
          />

          <StatusCard
            icon={<Bell className="w-6 h-6" />}
            title="推送订阅"
            value={isSubscribed ? '已订阅' : '未订阅'}
            color={isSubscribed ? 'green' : 'gray'}
          />

          <StatusCard
            icon={<HardDrive className="w-6 h-6" />}
            title="存储使用"
            value={`${storageUsage}%`}
            color={storageUsage > 80 ? 'red' : 'blue'}
          />
        </div>

        {/* Service Worker Section */}
        <Section title="Service Worker">
          <div className="space-y-4">
            <InfoRow label="支持状态" value={isServiceWorkerSupported() ? '支持' : '不支持'} />
            <InfoRow label="当前版本" value={swVersion || '未知'} />
            <InfoRow label="缓存项数" value={cacheSize.toString()} />

            <div className="flex gap-2">
              <Button onClick={handleCheckUpdate} icon={<RefreshCw className="w-4 h-4" />}>
                检查更新
              </Button>
              <Button onClick={handleClearCache} icon={<Trash2 className="w-4 h-4" />} variant="danger">
                清除缓存
              </Button>
            </div>
          </div>
        </Section>

        {/* Push Notifications Section */}
        <Section title="推送通知">
          <div className="space-y-4">
            <InfoRow label="支持状态" value={isPushSupported() ? '支持' : '不支持'} />
            <InfoRow label="订阅状态" value={isSubscribed ? '已订阅' : '未订阅'} />
            <InfoRow label="通知权限" value={typeof Notification !== 'undefined' ? Notification.permission : 'default'} />

            <div className="flex gap-2">
              {!isSubscribed ? (
                <Button onClick={handleSubscribe} icon={<Bell className="w-4 h-4" />}>
                  订阅推送
                </Button>
              ) : (
                <>
                  <Button onClick={handleUnsubscribe} variant="danger">
                    取消订阅
                  </Button>
                  <Button onClick={handleTestNotification}>
                    测试通知
                  </Button>
                </>
              )}
            </div>
          </div>
        </Section>

        {/* Offline Storage Section */}
        <Section title="离线存储">
          <div className="space-y-4">
            <InfoRow label="IndexedDB" value="支持" />
            <InfoRow label="存储使用率" value={`${storageUsage}%`} />

            <Button onClick={handleTestOfflineStorage} icon={<Database className="w-4 h-4" />}>
              测试离线存储
            </Button>
          </div>
        </Section>

        {/* Share Section */}
        <Section title="分享功能">
          <div className="space-y-4">
            <InfoRow label="Web Share API" value={typeof navigator !== 'undefined' && 'share' in navigator ? '支持' : '不支持'} />

            <Button onClick={handleShare} icon={<Share2 className="w-4 h-4" />}>
              测试分享
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  value,
  color
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function Button({
  onClick,
  icon,
  children,
  variant = 'primary'
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'primary' | 'danger';
}) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${variantClasses[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}
