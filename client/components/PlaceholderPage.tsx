import React from 'react';
import { Construction, ArrowRight, Sparkles, Zap, Star } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ 
  title, 
  description = "هذه الصفحة قيد التطوير وستكون متاحة قريباً",
  icon
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Card */}
        <div className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden backdrop-blur-xl">
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-blue via-transparent to-brand-orange"></div>
          </div>
          
          {/* Content */}
          <div className="relative p-12 lg:p-16 text-center">
            
            {/* Icon Section */}
            <div className="relative mb-8">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-brand-blue/10 via-brand-blue/5 to-transparent rounded-2xl flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm border border-white/20">
                {icon || <Construction size={40} className="text-brand-blue drop-shadow-sm" />}
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-brand-orange to-brand-orange-dark rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-4 leading-tight">
              {title}
            </h1>
            
            {/* Description */}
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              
              {/* Feature 1 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30 rounded-2xl p-6 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-xl flex items-center justify-center mb-4 mx-auto shadow-md">
                  <Sparkles size={24} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">استكشف القوائم</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">تصفح الصفحات المتاحة من القائمة الجانبية</p>
              </div>
              
              {/* Feature 2 */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border border-orange-200/50 dark:border-orange-700/30 rounded-2xl p-6 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-orange to-brand-orange-dark rounded-xl flex items-center justify-center mb-4 mx-auto shadow-md">
                  <Zap size={24} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">لوحة التحكم</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">راجع لوحة التحكم للحصول على نظرة عامة</p>
              </div>
              
              {/* Feature 3 */}
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30 rounded-2xl p-6 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-md">
                  <Star size={24} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">طلب ميزات</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">تواصل مع فريق التطوير لطلب ميزات جديدة</p>
              </div>
              
            </div>
            
            {/* Call to Action */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => window.history.back()}
                className="group bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg flex items-center justify-center gap-2"
              >
                <ArrowRight size={20} className="group-hover:-translate-x-1 transition-transform" />
                العودة للصفحة السابقة
              </button>
              
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="group bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg border border-gray-300/50 dark:border-gray-600/50"
              >
                الذهاب للوحة التحكم
              </button>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-12 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span>قيد التطوير</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
