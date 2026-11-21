import home from "../../../images/icon/home.svg";
import my from "../../../images/icon/my.svg";
import setting from "../../../images/icon/setting.svg";
import plusCircle from "../../../images/icon/plus_circle.svg";
import plus from "../../../images/icon/plus.svg";
import edit from "../../../images/icon/edit.svg";
import share from "../../../images/icon/share.svg";
import finished from "../../../images/icon/finished.svg";
import bin from "../../../images/icon/bin.svg";
import heart from "../../../images/icon/heart.svg";
import chevronDown from "../../../images/icon/chevron-down.svg";
import chevronLeft from "../../../images/icon/chevron-left.svg";
import chevronRight from "../../../images/icon/chevron-right.svg";
import chevronUp from "../../../images/icon/chevron-up.svg";

const icons = { home, my, setting, plusCircle, plus, edit, share, finished, bin, heart, chevronDown, chevronLeft, chevronRight, chevronUp };

export function AppIcon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  return <img className="app-icon" src={icons[name]} width={size} height={size} alt="" aria-hidden="true" draggable={false} />;
}
