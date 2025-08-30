import { useEffect } from 'react';

/**
 * Hook لمنع التمرير في الخلفية عند فتح النوافذ المنبثقة
 * @param isLocked - حالة قفل التمرير
 */
import React from 'react';

export const useLockBodyScroll = (isLocked: boolean) => {
  React.useEffect(() => {
    if (isLocked) {
      // حفظ الموضع الحالي للتمرير
      const scrollY = window.scrollY;
      const body = document.body;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // تطبيق الأنماط لمنع التمرير
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.overflow = 'hidden';
      
      // تعويض عرض شريط التمرير لتجنب التحرك الأفقي
      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`;
      }

      // تنظيف عند إلغاء القفل
      return () => {
        const scrollY = body.style.top;
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.overflow = '';
        body.style.paddingRight = '';
        
        // إعادة تعيين موضع التمرير
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
        }
      };
    }
  }, [isLocked]);
};
