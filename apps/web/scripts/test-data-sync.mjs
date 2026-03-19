#!/usr/bin/env node

/**
 * 数据同步系统测试脚本
 * 测试事件发布和订阅功能
 */

import { getDataSyncEventManager, SyncEventType } from '../src/lib/sync/data-sync-events.js';
import { getKGSyncCoordinator } from '../src/lib/sync/kg-sync-coordinator.js';

console.log('🧪 Starting Data Sync System Tests...\n');

// 测试 1: 事件管理器基本功能
console.log('Test 1: Event Manager Basic Functionality');
const eventManager = getDataSyncEventManager();

let receivedEvents = [];

// 订阅事件
const unsubscribe = eventManager.on(SyncEventType.KB_DOCUMENT_CREATED, (event) => {
  console.log('✅ Received event:', event.type);
  receivedEvents.push(event);
});

// 发布事件
eventManager.emit(SyncEventType.KB_DOCUMENT_CREATED, {
  id: 'test_doc_1',
  title: 'Test Document',
  content: 'Test content',
  tags: ['test'],
}, 'test-script');

// 等待事件处理
setTimeout(() => {
  if (receivedEvents.length > 0) {
    console.log('✅ Test 1 Passed: Event received successfully\n');
  } else {
    console.log('❌ Test 1 Failed: Event not received\n');
  }

  // 测试 2: 多个监听器
  console.log('Test 2: Multiple Listeners');
  let listener1Called = false;
  let listener2Called = false;

  eventManager.on(SyncEventType.RESOURCE_CREATED, () => {
    listener1Called = true;
  });

  eventManager.on(SyncEventType.RESOURCE_CREATED, () => {
    listener2Called = true;
  });

  eventManager.emit(SyncEventType.RESOURCE_CREATED, {
    id: 'test_res_1',
    title: 'Test Resource',
  }, 'test-script');

  setTimeout(() => {
    if (listener1Called && listener2Called) {
      console.log('✅ Test 2 Passed: Multiple listeners called\n');
    } else {
      console.log('❌ Test 2 Failed: Not all listeners called\n');
    }

    // 测试 3: 取消订阅
    console.log('Test 3: Unsubscribe');
    unsubscribe();
    receivedEvents = [];

    eventManager.emit(SyncEventType.KB_DOCUMENT_CREATED, {
      id: 'test_doc_2',
      title: 'Test Document 2',
    }, 'test-script');

    setTimeout(() => {
      if (receivedEvents.length === 0) {
        console.log('✅ Test 3 Passed: Unsubscribe works\n');
      } else {
        console.log('❌ Test 3 Failed: Event still received after unsubscribe\n');
      }

      // 测试 4: 事件统计
      console.log('Test 4: Event Statistics');
      const stats = eventManager.getStats();
      console.log('Event statistics:', stats);
      console.log('✅ Test 4 Passed: Statistics retrieved\n');

      // 测试 5: 知识图谱同步协调器
      console.log('Test 5: KG Sync Coordinator');
      const coordinator = getKGSyncCoordinator();
      coordinator.initialize();
      console.log('✅ Test 5 Passed: Coordinator initialized\n');

      // 清理
      coordinator.destroy();
      eventManager.clear();

      console.log('🎉 All tests completed!');
      process.exit(0);
    }, 100);
  }, 100);
}, 100);
