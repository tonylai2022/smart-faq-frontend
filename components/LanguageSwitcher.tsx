import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const LanguageSwitcher = () => {
    const router = useRouter();
    const { t } = useTranslation();

    const changeLanguage = (locale: string) => {
        router.push(router.pathname, router.asPath, { locale });
    };

    return (
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-300">
            <button
                onClick={() => changeLanguage('en')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${router.locale === 'en'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
            >
                English
            </button>
            <button
                onClick={() => changeLanguage('zh')}
                className={`px-4 py-2 rounded-md font-medium transition-colors min-w-[4.5rem] ${router.locale === 'zh'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
            >
                中文
            </button>
        </div>
    );
};

export default LanguageSwitcher; 