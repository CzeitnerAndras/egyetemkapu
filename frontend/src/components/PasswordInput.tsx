import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    showLabel?: string;
    hideLabel?: string;
};

export default function PasswordInput({
    className = '',
    showLabel = 'Jelszó megjelenítése',
    hideLabel = 'Jelszó elrejtése',
    ...props
}: PasswordInputProps) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative w-full">
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                className={`${className} w-full !pr-12`}
            />
            <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? hideLabel : showLabel}
                aria-pressed={visible}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-black/70 hover:text-black dark:text-[#c084fc] dark:hover:text-white secret:text-[#1cf85d]/80 secret:hover:text-[#1cf85d] cursor-pointer"
            >
                {visible ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
            </button>
        </div>
    );
}
