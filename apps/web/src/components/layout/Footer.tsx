'use client'

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>© 2026 EduNexus. All rights reserved.</div>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
          >
            ICP备案
          </a>
          <span>豫ICP备2026005340号-1</span>
        </div>
      </div>
    </footer>
  )
}
