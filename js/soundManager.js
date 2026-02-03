/**
 * soundManager.js
 * Web Audio API를 사용하여 게임 효과음을 합성하고 재생하는 모듈
 * 외부 오디오 파일 없이 즉석에서 소리를 만들어냅니다.
 */

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // 전체 볼륨 30%
        this.masterGain.connect(this.ctx.destination);
    }

    /**
     * 사과/포도 획득 소리 (딩동!)
     */
    playCollect() {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        // 높은 도(C6) -> 미(E6) 느낌의 맑은 소리
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C6
        osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.1); // E6

        // 짧고 경쾌하게
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    /**
     * 폭탄/게임오버 소리 (쿠궁...)
     */
    playBomb() {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        // 낮은 주파수에서 더 낮게 떨어지는 소리 (Sawtooth로 거칠게)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);

        // 쾅 하고 길게 사라짐
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.8);
    }
}

// 전역 인스턴스 생성
window.soundManager = new SoundManager();
