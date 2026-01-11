import {
  SquareLibrary,
  FileText,
  Settings2,
  Bug,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Brush,
  Lightbulb,
  Route,
  Globe,
  Users,
  MapPin,
  Feather,
  FlaskConical,
  Pencil,
  Plus,
  MessageCircleQuestionMark,
  ExternalLink,
  WandSparkles,
  X,
  TextSelect,
  Check,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  CircleAlert,
  Circle,
  Ellipsis,
  Rows3,
  Bookmark,
  Trash2,
  Search,
  BookOpenText,
} from 'lucide-react';

export type IconType =
  | 'parts'
  | 'part'
  | 'more'
  | 'validationError'
  | 'validationOk'
  | 'validationEmpty'
  | 'projects'
  | 'project'
  | 'manifest'
  | 'playground'
  | 'stories'
  | 'story'
  | 'prose'
  | 'brief'
  | 'outline'
  | 'world'
  | 'characters'
  | 'character'
  | 'locations'
  | 'location'
  | 'console'
  | 'settings'
  | 'back'
  | 'forward'
  | 'up'
  | 'down'
  | 'edit'
  | 'add'
  | 'trash'
  | 'prompt'
  | 'navigate'
  | 'wizard'
  | 'close'
  | 'selection'
  | 'check'
  | 'h2'
  | 'h3'
  | 'bulletList'
  | 'orderedList'
  | 'horizontalRule'
  | 'readingMode'
  | 'search';

export const Icon = ({type, size = 20, ...props}: {type: IconType, size?: number, strokeWidth?: number, style?: React.CSSProperties}) => {
	const iconProps = {
    strokeWidth: 1.5,
    size: size,
    ...props
	}
	switch (type) {
		case 'readingMode': {
			return <BookOpenText {...iconProps}/>
		}
		case 'up': {
			return <ChevronUp {...iconProps}/>
		}
		case 'down': {
			return <ChevronDown {...iconProps}/>
		}
		case 'parts': {
			return <Rows3 {...iconProps}/>
		}
		case 'part': {
			return <Bookmark {...iconProps}/>
		}
		case 'more': {
			return <Ellipsis {...iconProps}/>
		}
		case 'validationError': {
			return <CircleAlert {...iconProps}/>
		}
		case 'validationOk': {
			return <CircleAlert {...iconProps}/>
		}
		case 'validationEmpty': {
			return <Circle {...iconProps}/>
		}
		case 'projects': {
			return <SquareLibrary {...iconProps}/>
		}
		case 'project': {
			return <SquareLibrary {...iconProps}/>
		}
		case 'manifest': {
			return <Feather {...iconProps}/>
		}
		case 'playground': {
			return <FlaskConical {...iconProps}/>
		}
		case 'stories': {
			return <FileText {...iconProps}/>
		}
		case 'story': {
			return <FileText {...iconProps}/>
		}
		case 'prose': {
			return <Brush {...iconProps}/>
		}
		case 'brief': {
			return <Lightbulb {...iconProps}/>
		}
		case 'outline': {
			return <Route {...iconProps}/>
		}
		case 'world': {
			return <Globe {...iconProps}/>
		}
		case 'characters': {
			return <Users {...iconProps}/>
		}
		case 'character': {
			return <Users {...iconProps}/>
		}
		case 'locations': {
			return <MapPin {...iconProps}/>
		}
		case 'location': {
			return <MapPin {...iconProps}/>
		}
		case 'console': {
			return <Bug {...iconProps}/>
		}
		case 'settings': {
			return <Settings2 {...iconProps}/>
		}
		case 'back': {
			return <ChevronLeft {...iconProps}/>
		}
		case 'forward': {
			return <ChevronRight {...iconProps}/>
		}
		case 'edit': {
			return <Pencil {...iconProps}/>
		}
		case 'add': {
			return <Plus {...iconProps}/>
		}
		case 'trash': {
			return <Trash2 {...iconProps}/>
		}
    case 'prompt':
      return <MessageCircleQuestionMark {...iconProps}/>
    case 'navigate':
      return <ExternalLink {...iconProps}/>
    case 'wizard':
      return <WandSparkles {...iconProps}/>
    case 'close':
      return <X {...iconProps}/>
    case 'selection':
      return <TextSelect {...iconProps}/>
    case 'check':
      return <Check {...iconProps}/>
    case 'h2':
      return <Heading2 {...iconProps}/>
    case 'h3':
      return <Heading3 {...iconProps}/>
    case 'bulletList':
      return <List {...iconProps}/>
    case 'orderedList':
      return <ListOrdered {...iconProps}/>
    case 'horizontalRule':
      return <Minus {...iconProps}/>
    case 'search':
      return <Search {...iconProps}/>
	}
	console.log(type)
	return null;
}