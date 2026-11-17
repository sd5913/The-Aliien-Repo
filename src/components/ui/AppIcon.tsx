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

const icons = { home, my, setting, plusCircle, plus, edit, share, finished, bin, heart };

export function AppIcon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  return <img className="app-icon" src={icons[name]} width={size} height={size} alt="" aria-hidden="true" draggable={false} />;
}
