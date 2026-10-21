/* Presentation-only workspace composition; existing controls retain their IDs. */
(function(root){
  function boardLayout(width,height,fullscreen){
    const usable=Math.max(1,width-32);
    const scale=Math.min(1,usable/1920,fullscreen?Math.max(1,height-32)/1080:1);
    return {scale,height:Math.ceil(1080*scale+32)};
  }
  function compose(doc){
    const controls=new Map([...doc.querySelectorAll('[id]')].map(el=>['#'+el.id,el]));
    const q=s=>controls.get(s)||doc.querySelector(s);
    const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
    const append=(host,...nodes)=>{nodes.filter(Boolean).forEach(n=>host.appendChild(n));return host;};
    const buttonText=(id,text)=>{q(id).textContent=text;};
    const fold=(title,description,...nodes)=>{
      const detail=make('details','ui-fold'),summary=make('summary','',title),body=make('div','ui-fold-body');
      if(description)body.appendChild(make('p','ui-help',description));
      append(body,...nodes);append(detail,summary,body);return detail;
    };
    doc.body.classList.add('simple-ui');
    q('.page-bg')?.remove();
    const header=q('.topbar-inner'),brand=q('.brand'),nav=q('.workspace-tabs');
    q('.brand-copy small').textContent='Công cụ bảng điểm Free Fire';
    const actions=append(make('div','ui-header-actions'),q('#fullscreenBtn'),q('#downloadBtn'));
    header.replaceChildren(brand,nav,actions);
    buttonText('#fullscreenBtn','Toàn màn hình');buttonText('#downloadBtn','Xuất PNG');
    const hero=q('.hero');hero.replaceChildren(make('h1','','Bảng điểm giải đấu'),make('p','','Nhập trận đấu, chọn mẫu và tạo bảng xếp hạng của bạn.'));
    q('.control-header')?.remove();q('.panel-corner')?.remove();q('.panel-corner')?.remove();
    const field=q('.field-wrap label');field.replaceChildren(doc.createTextNode('Match ID'),make('span','','Ngăn cách nhiều ID bằng dấu phẩy'));
    q('#matchId').placeholder='Nhập Match ID...';q('#matchId').setAttribute('aria-label','Match ID');
    q('#status').setAttribute('role','status');q('#status').setAttribute('aria-live','polite');
    buttonText('#fetchBtn','Lấy điểm');buttonText('#latestBtn','Trận gần nhất');buttonText('#detailBtn','Chi tiết trận đấu');
    buttonText('#exportBtn','Lưu dữ liệu JSON');buttonText('#importBtn','Mở dữ liệu JSON');buttonText('#resetBtn','Khôi phục mặc định');
    const modes=q('.toolbar-group'),json=append(make('div','ui-file-actions'),q('#exportBtn'),q('#importBtn'),q('#importFile'));
    const settings=make('aside','ui-settings');settings.setAttribute('aria-label','Thiết lập bảng điểm');
    const settingsHeader=append(make('div','ui-settings-heading'),make('h2','','Thiết lập'),make('p','','Tùy chỉnh mẫu đang chọn.'));
    const template=append(make('label','ui-template-field'),make('span','','Mẫu bảng điểm'),q('#rankingTemplateSelect'));
    const fontControls=q('.ranking-font-controls');fontControls.querySelector('legend').textContent='Kiểu chữ';
    for(const [id,label] of [['rankingNameFont','Tên đội'],['rankingStatsFont','Số liệu'],['rankingTitleFont','Tiêu đề giải']]){
      const select=q('#'+id),parent=select.parentElement;parent.replaceChildren(doc.createTextNode(label),select);
    }
    const titleControl=q('#ffptTitleControl'),titleInput=q('#ffptTitleInput');
    const fnTitle=make('textarea','hidden');fnTitle.id='fnTitleInput';fnTitle.rows=3;fnTitle.maxLength=100;fnTitle.placeholder='Tên giải đấu\nTên vòng đấu';fnTitle.setAttribute('aria-label','Tiêu đề giải Standing FN');
    const fnHelp=make('small','ui-fn-title-help hidden','Nhấn Enter để xuống dòng. Chữ tự nghiêng theo khung.');
    titleControl.replaceChildren(doc.createTextNode('Tiêu đề giải'),titleInput,fnTitle,fnHelp);
    append(settings,settingsHeader,template,titleControl,fontControls);
    const logos=append(make('div','ui-logo-tools'),q('#rankingBulkLogoBtn'),q('#rankingBulkLogoInput'),q('#rankingBulkLogoToolBtn'),q('#rankingBulkLogoStatus'));
    buttonText('#rankingBulkLogoBtn','Chọn nhiều logo');buttonText('#rankingBulkLogoToolBtn','Chọn thêm logo');
    q('#rankingBulkLogoToolBtn').classList.add('ui-hidden-duplicate');
    const drive=q('.drive-row');q('#driveUrl').setAttribute('aria-label','Link thư mục logo Google Drive');buttonText('#driveBtn','Tải logo');
    const logoFold=fold('Logo đội','Chọn nhiều ảnh có tên file trùng tên đội, hoặc bấm ô logo trên bảng để thêm từng đội.',logos,make('p','ui-field-label','Từ Google Drive'),drive);
    const ocrActions=q('.ai-score-actions');
    buttonText('#scoreImageBtn','Chọn ảnh bảng điểm');buttonText('#scoreFromRankingBtn','Lấy từ bảng hiện tại');
    const imageFold=fold('Nhập bảng điểm từ ảnh','Đọc ảnh bằng OCR hoặc điền dữ liệu hiện tại lên ảnh mẫu. Hãy kiểm tra số liệu trước khi áp dụng.',ocrActions,q('#scoreImagePicker'));
    const dataFold=fold('Dữ liệu & sao lưu','Lưu dữ liệu ra JSON để tiếp tục làm việc sau.',json);
    const resetFold=fold('Khôi phục mặc định','Xóa dữ liệu và tùy chỉnh đang lưu trong trình duyệt.',q('#resetBtn'));
    const extras=append(make('section','ui-extras'),make('h3','','Công cụ khác'),logoFold,imageFold,dataFold,resetFold);
    append(settings,extras,q('#logoPicker'));
    const stage=make('section','ui-stage');stage.setAttribute('aria-label','Xem trước bảng điểm');
    const stageHeader=append(make('div','ui-stage-header'),append(make('div'),make('h2','','Xem trước bảng điểm'),make('span','ui-stage-size','1920 × 1080 · PNG')),make('span','ui-data-badge','Chưa có dữ liệu'));
    const viewport=q('#canvasViewport');
    append(stage,stageHeader,viewport,make('p','ui-stage-caption','Bấm vào ô logo để chọn ảnh cho từng đội. Font và mẫu được lưu tự động.'));
    const designer=q('#designerTab');designer.replaceChildren(stage,settings);
    const toolbar=q('.toolbar');toolbar.replaceChildren(modes);
    const summarySection=q('.summary-section');summarySection.querySelector('.section-title-row')?.remove();
    const summaryFold=fold('Thông tin trận đấu','',q('#matchSummary'));summaryFold.classList.add('ui-summary');summarySection.replaceChildren(summaryFold);
    q('.workspace').after(summarySection);
    q('[data-tab="designer"]').textContent='Bảng điểm';q('[data-tab="templates"]').textContent='Kho mẫu';
    q('.template-header').replaceChildren(make('h2','','Kho mẫu bảng điểm'),make('p','ui-help','Chọn mẫu có sẵn hoặc thêm ảnh nền của riêng bạn.'));
    q('.ranking-manager-intro').textContent='Các mẫu dùng chung dữ liệu trận đấu. Chọn mẫu, thêm ảnh nền hoặc căn lại vị trí các cột.';
    buttonText('#rankingAddBlank','Thêm ảnh nền trống');buttonText('#rankingAnalyzeReference','Phân tích ảnh tham chiếu');
    q('#templateName').placeholder='Tên mẫu tiêu đề...';buttonText('#saveTemplateBtn','Lưu tiêu đề');
    const templateCreate=q('.template-create');templateCreate.before(make('h3','ui-saved-heading','Tiêu đề đã lưu'));
    q('.page-footer').replaceChildren(make('span','','FF Standings'),make('span','','BEE · Standing FN · FFPT'));
    doc.title='FF Standings · Bảng điểm giải đấu';
    q('meta[name="theme-color"]').content='#f4f6fa';
  }
  const api={boardLayout,compose};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else {root.WorkspaceUI=api;compose(document);}
})(typeof window!=='undefined'?window:globalThis);
