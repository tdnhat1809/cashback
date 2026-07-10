import React, { useEffect, useState } from 'react';
import { mockGifts, mockTasks, type RewardGift } from '../../mockData';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ToastContainer } from '../../components/Toast';
import { defaultToastState, triggerToast } from '../../components/toast-state';
import type { ToastState } from '../../components/toast-state';
import { Award, Sparkles, Check, Gift } from 'lucide-react';
import { userFeaturesApi } from '../../services/apiClient';

export const Rewards: React.FC = () => {
  const [points, setPoints] = useState(0);
  const tasks = mockTasks;
  const gifts = mockGifts;
  const [toast, setToast] = useState<ToastState>(defaultToastState);

  useEffect(() => { void userFeaturesApi.points().then((result) => setPoints(result.balance)).catch(() => setPoints(0)); }, []);

  const handleCheckIn = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.completed) return;
    triggerToast(setToast, `Nhiệm vụ “${task.title}” đang được hoàn thiện phía máy chủ; Xu chỉ được ghi có khi đối soát hợp lệ.`, 'info');
  };

  const handleRedeem = (gift: RewardGift) => {
    if (points < gift.cost) {
      triggerToast(setToast, 'Số Xu thưởng của bạn không đủ để đổi phần quà này.', 'error');
      return;
    }

    triggerToast(setToast, `Đổi quà “${gift.title}” chưa được mở vì cần luồng duyệt vận hành.`, 'info');
  };

  return (
    <div className="space-y-8 text-left animate-fade-in">
      {/* Title & Points box */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="font-headline-md text-on-surface">Xu thưởng & Nhiệm vụ</h1>
          <p className="text-xs text-on-surface-variant">Tích lũy Xu thưởng để đổi voucher mua sắm đặc quyền (Không thể rút như tiền mặt).</p>
        </div>
        
        {/* Points Display */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 rounded-2xl text-white shadow-lg flex items-center gap-4 shrink-0">
          <Award size={36} className="text-amber-100 animate-pulse" />
          <div className="text-left">
            <span className="text-[10px] text-amber-100 uppercase font-bold block mb-0.5">Số Xu tích lũy</span>
            <span className="text-2xl font-black tracking-tight">{points.toLocaleString('vi-VN')} Xu</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Tasks List */}
        <div className="lg:col-span-6 bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-soft space-y-6">
          <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5">
            <Sparkles size={18} className="text-primary" /> Nhiệm vụ tích Xu hằng ngày
          </h3>

          <div className="space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors
                  ${task.completed 
                    ? 'bg-surface-container-low/30 border-outline-variant/20' 
                    : 'bg-white border-outline-variant/40 hover:bg-surface-container-low/10'
                  }
                `}
              >
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className={`text-xs font-bold ${task.completed ? 'text-on-surface-variant/70 line-through' : 'text-on-surface'}`}>
                      {task.title}
                    </h5>
                    <Badge variant={task.type === 'daily' ? 'info' : 'shopee'} className="!text-[8px] !px-1.5 !py-0">
                      {task.type === 'daily' ? 'Hằng ngày' : '1 lần'}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 block mt-1">+{task.reward} Xu</span>
                </div>
                
                {task.completed ? (
                  <span className="w-8 h-8 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center border border-tertiary/20">
                    <Check size={16} />
                  </span>
                ) : (
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleCheckIn(task.id)}
                  >
                    Làm ngay
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Gift Catalog */}
        <div className="lg:col-span-6 space-y-6">
          <h3 className="font-title-lg text-sm font-bold flex items-center gap-1.5">
            <Gift size={18} className="text-primary" /> Quà tặng đổi Xu đặc quyền
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gifts.map((gift) => {
              const canRedeem = points >= gift.cost && gift.stock > 0;
              return (
                <div key={gift.id} className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-soft flex flex-col justify-between gap-4 h-full">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-surface-container overflow-hidden shrink-0">
                      <img src={gift.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left min-w-0">
                      <h4 className="font-bold text-xs text-on-surface truncate block">{gift.title}</h4>
                      <span className="text-[10px] text-on-surface-variant/80 block mt-0.5">Còn lại: {gift.stock} chiếc</span>
                      <span className="text-xs font-black text-amber-600 block mt-1.5">{gift.cost} Xu</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canRedeem}
                    onClick={() => handleRedeem(gift)}
                    className={`w-full py-2.5 font-bold text-xs
                      ${canRedeem 
                        ? 'hover:!bg-primary hover:!text-white' 
                        : 'disabled:opacity-40 disabled:bg-surface-container'
                      }
                    `}
                  >
                    {gift.stock === 0 ? 'Hết quà' : 'Đổi quà ngay'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ToastContainer toast={toast} setToast={setToast} />
    </div>
  );
};
