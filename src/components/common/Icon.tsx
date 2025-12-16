import {
  SquareLibrary,
  FileText,
  Settings2,
  Bug,
  ChevronRight,
  ChevronLeft,
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
  MessageCircleMore,
  SquareMousePointer,
  WandSparkles,
  X,
  TextSelect,
  Check,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
} from 'lucide-react';

export const Icon = ({type, size = 20, ...props}) => {
	const iconProps = {
    strokeWidth: 1.5,
    size: size,
    ...props
	}
	switch (type) {
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
		case 'edit': {
			return <Pencil {...iconProps}/>
		}
		case 'add': {
			return <Plus {...iconProps}/>
		}
    case 'prompt':
      return <MessageCircleMore {...iconProps}/>
    case 'navigate':
      return <SquareMousePointer {...iconProps}/>
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
	}
	console.log(type)
	return null;
}