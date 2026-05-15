import { HelpCircle, BookOpen, MessageCircleQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function HelpMenu() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isMs = i18n.language?.startsWith('ms');

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              data-tutorial="help-btn"
              className="h-8 w-8 rounded-full border border-border bg-transparent text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors mr-2"
              aria-label={t('header.tutorial')}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{isMs ? 'Pusat Bantuan' : 'Help Center'}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48 bg-card">
        <DropdownMenuItem onClick={() => window.__startWorkTraceTutorial?.()}>
          <BookOpen className="h-4 w-4 mr-2" /> {isMs ? 'Tutorial' : 'Tutorial'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/faq')}>
          <MessageCircleQuestion className="h-4 w-4 mr-2" /> {isMs ? 'Soalan Lazim' : 'FAQ'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
