export const IS_FIREFOX = navigator.userAgent.toLowerCase().includes('firefox');

export function createElement(className = '', content = '', angle = null, style = null) {
    const element = document.createElement('DIV');

    element.className = Array.isArray(className) ? className.join(' ') : className;

    if (typeof content === 'string') {
        element.innerText = content;
    } else if (content) {
        element.appendChild(content);
    }

    if (style) {
        element.style = style;
    }

    if (angle !== null) {
        element.style.transform = `rotate(${angle}deg)`;
    }

    return element;
}

export function shuffle(array) {
    const arr = [...array];

    for (let i = arr.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1));

        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}

let dynamicStyles = null;

export function addAnimation(name, body) {
    if (!dynamicStyles) {
        dynamicStyles = document.createElement('style');
        dynamicStyles.type = 'text/css';
        document.head.appendChild(dynamicStyles);
    }

    dynamicStyles.sheet.insertRule(`@keyframes ${name} {
        ${body}
    }`, dynamicStyles.length);
}

export function resetAnimations() {
    if (dynamicStyles) {
        dynamicStyles.remove();

        dynamicStyles = null;
    }
}

export function stopAtAnimation(name, start, end, alpha, speed) {
    const angles = [
        start,
        end - (alpha * 0.25),
        end + (alpha * 0.125),
        end - (alpha * 0.0625),
        end + (alpha * 0.03125),
        end - (alpha * 0.015625),
        end,
    ];

    let previousAngle = start;
    let total = 0;

    const time = angles.map((angle) => {
        const delta = Math.max(Math.abs(angle - previousAngle) / Math.abs(speed), 10);

        previousAngle = angle;
        total += delta;

        return delta;
    });

    let previousPercent = 0;

    const percent = time.map((t) => {
        const p = previousPercent + (100 * t / total);

        previousPercent = p;

        return p;
    });

    const animation = percent.map((p, i) => `${Math.round(p)}% { transform: rotate(${angles[i].toFixed(2)}deg); }`).join('\n');

    addAnimation(name, animation);

    return total;
}
