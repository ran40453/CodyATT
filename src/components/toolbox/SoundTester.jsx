import React from 'react';
import { motion } from 'framer-motion';
import { X, Volume2, Music, Check } from 'lucide-react';

export default function SoundTester({ isOpen, onClose }) {
    if (!isOpen) return null;

    const playSound = (type) => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
            case 'crystal': // Current
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, t);
                osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
                gain.gain.setValueAtTime(0.0, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.35);
                break;

            case 'mechanical': // Mechanical Switch
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, t);
                gain.gain.setValueAtTime(0.0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case 'bubble': // Water Drop
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
                gain.gain.setValueAtTime(0.0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.25);
                break;

            case 'wood': // Wood Block
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, t);
                gain.gain.setValueAtTime(0.0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03); // Very short
                osc.start(t);
                osc.stop(t + 0.05);
                break;

            case 'modern': // Modern UI Click (Higher pitch, clean)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(2000, t); // Very high
                gain.gain.setValueAtTime(0.0, t);
                gain.gain.linearRampToValueAtTime(0.05, t + 0.002); // Quiet
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case 'thud': // Background Thud (Reference)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(80, t);
                osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
                gain.gain.setValueAtTime(0.0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.15);
                break;
        }
    };

    const options = [
        { id: 'crystal', label: '1. Crystal (Current)', desc: '高頻水晶音' },
        { id: 'mechanical', label: '2. Mechanical', desc: '機械鍵盤軸體聲' },
        { id: 'bubble', label: '3. Bubble', desc: '氣泡/水滴聲' },
        { id: 'wood', label: '4. Wood Block', desc: '短促木魚聲' },
        { id: 'modern', label: '5. Modern Click', desc: '極簡高頻短音' },
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <Volume2 className="text-neumo-brand" />
                        Sound Lab
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="space-y-3">
                    {options.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => playSound(opt.id)}
                            className="w-full p-4 rounded-xl bg-gray-50 hover:bg-neumo-brand/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-between group border border-gray-100"
                        >
                            <div className="text-left">
                                <div className="text-sm font-black text-gray-700 group-hover:text-neumo-brand transition-colors">{opt.label}</div>
                                <div className="text-xs text-gray-400 font-bold">{opt.desc}</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-neumo-brand">
                                <Music size={16} />
                            </div>
                        </button>
                    ))}

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => playSound('thud')}
                            className="w-full p-3 rounded-xl bg-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                            Test Background Sound (Thud)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
